import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../../config/logger.js';
import { PersonalContext } from './personalContext.service.js';
import { AIOrchestratorService, EngineExecutionResults } from './aiOrchestrator.service.js';
import { RetrievedChunk, AIService } from './ai.service.js';

export type ErrorCategory =
  | 'BILLING_EXHAUSTED'
  | 'RATE_LIMITED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_MODEL'
  | 'TRANSIENT_SERVER_ERROR'
  | 'UNKNOWN';

export interface FailedProviderAttempt {
  provider: string;
  model?: string;
  category?: ErrorCategory;
  reason: string;
}

export interface ProviderResult {
  answer: string;
  provider: 'OpenAI response' | 'Gemini response' | 'Groq response' | 'Grounded knowledge fallback';
  model: string;
  sources?: RetrievedChunk[];
  failedAttempts?: FailedProviderAttempt[];
}

export interface ProviderRequestOptions {
  systemPrompt: string;
  question: string;
  personalContext: PersonalContext;
  engineResults: EngineExecutionResults;
  retrievedChunks: RetrievedChunk[];
  timeoutMs?: number;
}

export class QuotaExceededError extends Error {
  constructor(message = 'Provider quota exceeded (429)') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Scrub sensitive keys, tokens, and personal emails from error logs and metadata
 */
export function sanitizeProviderError(msg: string): string {
  if (!msg) return 'Unknown provider error';
  return msg
    .replace(/gsk_[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/AIza[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/xai-[a-zA-Z0-9_\-]{8,}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
}

/**
 * Categorize provider errors into distinct operational classes with tailored cooldown durations.
 * Distinguishes permanent credit exhaustion (10m) from temporary rate limiting (30s),
 * invalid credentials (10m), model deprecations (5m), and transient 5xx/timeouts (15s).
 */
export function categorizeProviderError(err: any): { category: ErrorCategory; cooldownMs: number; reason: string } {
  const msg = (err?.message || String(err)).toLowerCase();
  const status = err?.status;

  // 1. Quota / Credits vs Rate Limit
  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('credit')) {
    if (msg.includes('credits remaining') || msg.includes('insufficient_quota') || msg.includes('billing')) {
      return {
        category: 'BILLING_EXHAUSTED',
        cooldownMs: 600_000, // 10 minutes
        reason: 'Account credit balance exhausted / billing required',
      };
    }
    return {
      category: 'RATE_LIMITED',
      cooldownMs: 30_000, // 30 seconds
      reason: 'Temporary rate limit reached (RPM/TPM)',
    };
  }

  // 2. Invalid Credentials (401)
  if (status === 401 || msg.includes('401') || msg.includes('invalid api key') || msg.includes('incorrect api key') || msg.includes('authentication')) {
    return {
      category: 'INVALID_CREDENTIALS',
      cooldownMs: 600_000, // 10 minutes
      reason: 'Invalid API credentials / unauthorized (401)',
    };
  }

  // 3. Invalid Model or Decommissioned (404 / 400 model_decommissioned)
  if (status === 404 || msg.includes('not found') || msg.includes('decommissioned') || msg.includes('model_not_found') || msg.includes('no longer available')) {
    return {
      category: 'INVALID_MODEL',
      cooldownMs: 300_000, // 5 minutes
      reason: 'Configured model unavailable or decommissioned (404)',
    };
  }

  // 4. Transient Server Errors (5xx / Timeouts)
  if (status >= 500 || msg.includes('timed out') || msg.includes('timeout') || msg.includes('503') || msg.includes('502')) {
    return {
      category: 'TRANSIENT_SERVER_ERROR',
      cooldownMs: 15_000, // 15 seconds
      reason: 'Transient provider 5xx error or request timeout',
    };
  }

  return {
    category: 'UNKNOWN',
    cooldownMs: 30_000,
    reason: sanitizeProviderError(err?.message || 'Provider error'),
  };
}

/**
 * Determine if an error is an unrecoverable client validation error
 * that must be thrown directly without failing over to subsequent LLMs.
 */
export function isUserValidationError(err: any): boolean {
  if (err?.name === 'ZodError' || err?.name === 'ValidationError') return true;
  if (err?.isUserInputError) return true;
  if (err?.status === 400 && (err?.message?.includes('maximum context length') || err?.message?.includes('validation failed'))) {
    return true;
  }
  return false;
}

export class OpenAIAdapter {
  static getClient(): OpenAI | null {
    return AIService.getOpenAIClient();
  }

  static isConfigured(): boolean {
    return Boolean(this.getClient());
  }

  static async generate(opts: ProviderRequestOptions): Promise<ProviderResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('OpenAI client is not configured with a valid API key');
    }

    const timeoutMs = opts.timeoutMs ?? 8000;
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const executeCall = async () => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI request timed out')), timeoutMs)
      );

      const completionPromise = client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.question },
        ],
        max_tokens: 650,
        temperature: 0.3,
      });

      return await Promise.race([completionPromise, timeoutPromise]);
    };

    try {
      const response = await executeCall();
      const content = response.choices[0]?.message.content;
      if (!content || content.trim().length === 0) {
        throw new Error('OpenAI returned empty response content');
      }
      return {
        answer: content,
        provider: 'OpenAI response',
        model,
      };
    } catch (err: any) {
      // 429 Quota exhaustion — do not retry, fail over immediately
      if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.toLowerCase().includes('quota'))) {
        throw new QuotaExceededError(err.message || 'OpenAI quota exceeded');
      }
      // Bounded retry once for transient timeouts or 5xx
      if (err.status >= 500 || (err.message && err.message.includes('timed out'))) {
        logger.warn({ err: sanitizeProviderError(err.message) }, 'OpenAI request failed, attempting single bounded retry');
        await new Promise((r) => setTimeout(r, 600));
        const retryRes = await executeCall();
        const content = retryRes.choices[0]?.message.content;
        if (content && content.trim().length > 0) {
          return { answer: content, provider: 'OpenAI response', model };
        }
      }
      throw err;
    }
  }
}

export class GeminiAdapter {
  static getClient(): GoogleGenAI | null {
    return AIService.getGeminiClient();
  }

  static isConfigured(): boolean {
    return Boolean(this.getClient());
  }

  static async generate(opts: ProviderRequestOptions): Promise<ProviderResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Google Gemini is not configured with a valid GEMINI_API_KEY');
    }

    const timeoutMs = opts.timeoutMs ?? 8000;
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    const executeCall = async (targetModel: string) => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs)
      );

      const geminiPromise = client.models.generateContent({
        model: targetModel,
        contents: [
          {
            role: 'user',
            parts: [{ text: `${opts.systemPrompt}\n\nUser Question: ${opts.question}` }],
          },
        ],
      });

      return await Promise.race([geminiPromise, timeoutPromise]);
    };

    try {
      const response = await executeCall(configuredModel);
      const content = response.text;
      if (!content || content.trim().length === 0) {
        throw new Error('Google Gemini returned empty response text');
      }
      return {
        answer: content,
        provider: 'Gemini response',
        model: configuredModel,
      };
    } catch (err: any) {
      if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.toLowerCase().includes('quota'))) {
        throw new QuotaExceededError(err.message || 'Gemini quota exceeded');
      }
      // Single bounded retry for transient errors
      if (err.status >= 500 || (err.message && err.message.includes('timed out'))) {
        logger.warn({ err: sanitizeProviderError(err.message) }, 'Gemini request failed, attempting single bounded retry');
        await new Promise((r) => setTimeout(r, 600));
        const retryRes = await executeCall(configuredModel);
        if (retryRes.text && retryRes.text.trim().length > 0) {
          return { answer: retryRes.text, provider: 'Gemini response', model: configuredModel };
        }
      }
      throw err;
    }
  }
}

export class GroqAdapter {
  static getClient(): OpenAI | null {
    return AIService.getGroqClient();
  }

  static isConfigured(): boolean {
    return Boolean(this.getClient());
  }

  static async generate(opts: ProviderRequestOptions): Promise<ProviderResult> {
    const client = this.getClient();
    if (!client) {
      throw new Error('Groq client is not configured with a valid GROQ_API_KEY');
    }

    const timeoutMs = opts.timeoutMs ?? 8000;
    const configuredModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

    const executeCall = async (targetModel: string) => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Groq request timed out')), timeoutMs)
      );

      const completionPromise = client.chat.completions.create({
        model: targetModel,
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.question },
        ],
        max_tokens: 650,
        temperature: 0.3,
      });

      return await Promise.race([completionPromise, timeoutPromise]);
    };

    try {
      const response = await executeCall(configuredModel);
      const content = response.choices[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error('Groq returned empty response content');
      }
      return {
        answer: content,
        provider: 'Groq response',
        model: configuredModel,
      };
    } catch (err: any) {
      // 429 Quota / Rate-limit exhaustion — do not retry, fail over immediately
      if (
        err.status === 429 ||
        (err.message && err.message.includes('429')) ||
        (err.message && err.message.toLowerCase().includes('quota')) ||
        (err.message && err.message.toLowerCase().includes('rate limit'))
      ) {
        throw new QuotaExceededError(err.message || 'Groq quota or rate limit exceeded');
      }
      // Bounded retry once for transient timeouts or 5xx
      if (err.status >= 500 || (err.message && err.message.includes('timed out'))) {
        logger.warn({ err: sanitizeProviderError(err.message) }, 'Groq request failed, attempting single bounded retry');
        await new Promise((r) => setTimeout(r, 600));
        const retryRes = await executeCall(configuredModel);
        const content = retryRes.choices[0]?.message?.content;
        if (content && content.trim().length > 0) {
          return { answer: content, provider: 'Groq response', model: configuredModel };
        }
      }
      throw err;
    }
  }
}

export class DeterministicAdapter {
  static generate(opts: ProviderRequestOptions): ProviderResult {
    const fallback = AIOrchestratorService.synthesizeDeterministicAnswer(
      opts.personalContext,
      opts.engineResults,
      opts.retrievedChunks,
      opts.question
    );
    return {
      answer: fallback.answer,
      provider: 'Grounded knowledge fallback',
      model: 'deterministic-engine',
      sources: fallback.sources,
    };
  }
}

interface ProviderCooldown {
  until: number;
  reason: string;
}

const providerCooldowns = new Map<string, ProviderCooldown>();

export class AIProviderManager {
  /**
   * Check if a provider is temporarily paused by the circuit breaker
   */
  static isProviderInCooldown(providerKey: string): boolean {
    const key = providerKey.toLowerCase();
    const cd = providerCooldowns.get(key);
    if (!cd) return false;
    if (Date.now() > cd.until) {
      providerCooldowns.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Put a provider on cooldown
   */
  static setProviderCooldown(providerKey: string, durationMs: number, reason: string): void {
    const key = providerKey.toLowerCase();
    providerCooldowns.set(key, {
      until: Date.now() + durationMs,
      reason,
    });
  }

  /**
   * Get active cooldown info for inspection / debugging
   */
  static getProviderCooldown(providerKey: string): ProviderCooldown | undefined {
    const key = providerKey.toLowerCase();
    const cd = providerCooldowns.get(key);
    if (cd && Date.now() <= cd.until) {
      return cd;
    }
    return undefined;
  }

  /**
   * Clear all active circuit-breaker cooldowns (useful for tests)
   */
  static resetCooldowns(): void {
    providerCooldowns.clear();
  }

  /**
   * Determine ordered list of live AI providers to attempt:
   * Defaults to: ['openai', 'gemini', 'groq']
   */
  static getProviderSequence(): string[] {
    if (process.env.AI_PROVIDER_ORDER) {
      return process.env.AI_PROVIDER_ORDER.split(',')
        .map((p) => p.trim().toLowerCase())
        .filter((p) => Boolean(p) && p !== 'deterministic');
    }

    const defaultSeq = [
      (process.env.PRIMARY_AI_PROVIDER || 'openai').toLowerCase(),
      (process.env.SECONDARY_AI_PROVIDER || 'gemini').toLowerCase(),
      (process.env.TERTIARY_AI_PROVIDER || 'groq').toLowerCase(),
    ];

    const seen = new Set<string>();
    const order: string[] = [];
    for (const p of defaultSeq) {
      const normalized = p === 'grok' ? 'groq' : p;
      if (normalized && normalized !== 'deterministic' && !seen.has(normalized)) {
        seen.add(normalized);
        order.push(normalized);
      }
    }

    // Ensure canonical failover order is preserved: openai -> gemini -> groq
    for (const p of ['openai', 'gemini', 'groq']) {
      if (!seen.has(p)) {
        seen.add(p);
        order.push(p);
      }
    }

    return order;
  }

  /**
   * Execute 3-tier multi-provider strategy:
   * 1. OpenAI (Primary)
   * 2. Gemini (Secondary)
   * 3. Groq (Tertiary)
   * 4. SkinAI Deterministic Knowledge Engine (Safe Grounded Fallback)
   */
  static async execute(opts: ProviderRequestOptions): Promise<ProviderResult> {
    const sequence = this.getProviderSequence();
    const failedAttempts: FailedProviderAttempt[] = [];

    for (const providerKey of sequence) {
      // 1. Check if provider is configured with valid credentials
      let isConfigured = false;
      let adapterName = providerKey;

      if (providerKey === 'openai') {
        isConfigured = OpenAIAdapter.isConfigured();
        adapterName = 'OpenAI';
      } else if (providerKey === 'gemini') {
        isConfigured = GeminiAdapter.isConfigured();
        adapterName = 'Gemini';
      } else if (providerKey === 'groq' || providerKey === 'grok') {
        isConfigured = GroqAdapter.isConfigured();
        adapterName = 'Groq';
      }

      if (!isConfigured) {
        failedAttempts.push({
          provider: adapterName,
          category: 'INVALID_CREDENTIALS',
          reason: 'Provider not configured or missing API credentials',
        });
        continue;
      }

      // 2. Check circuit-breaker cooldown
      if (this.isProviderInCooldown(providerKey)) {
        const cd = this.getProviderCooldown(providerKey);
        failedAttempts.push({
          provider: adapterName,
          reason: `Provider currently in cooldown (${cd?.reason || 'temporarily paused'})`,
        });
        continue;
      }

      // 3. Attempt live generation
      try {
        let result: ProviderResult;
        if (providerKey === 'openai') {
          result = await OpenAIAdapter.generate(opts);
        } else if (providerKey === 'gemini') {
          result = await GeminiAdapter.generate(opts);
        } else {
          result = await GroqAdapter.generate(opts);
        }

        return {
          ...result,
          failedAttempts: failedAttempts.length > 0 ? failedAttempts : undefined,
        };
      } catch (err: any) {
        // Non-retryable user validation errors must NOT fail over
        if (isUserValidationError(err)) {
          throw err;
        }

        const categorized = categorizeProviderError(err);
        this.setProviderCooldown(providerKey, categorized.cooldownMs, categorized.reason);

        const sanitizedReason = sanitizeProviderError(err.message || String(err));
        failedAttempts.push({
          provider: adapterName,
          category: categorized.category,
          reason: sanitizedReason,
        });

        logger.warn(
          {
            provider: providerKey,
            category: categorized.category,
            cooldownMs: categorized.cooldownMs,
            reason: sanitizedReason,
          },
          `Live provider ${adapterName} failed (${categorized.category}), advancing to next provider in failover chain`
        );
      }
    }

    // 4. All live providers exhausted or unconfigured -> Safe Grounded Knowledge Engine Fallback
    logger.info(
      { failedAttemptsCount: failedAttempts.length },
      'All live AI providers exhausted or unavailable; activating SkinAI Grounded Knowledge Fallback'
    );

    const fallbackResult = DeterministicAdapter.generate(opts);
    return {
      ...fallbackResult,
      failedAttempts,
    };
  }
}
