// @ts-nocheck
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { AIService } from '../ai.service.js';
import { AIOrchestratorService } from '../aiOrchestrator.service.js';
import { PersonalContextService, PersonalContext } from '../personalContext.service.js';
import { AIProviderManager, QuotaExceededError, sanitizeProviderError, isUserValidationError, categorizeProviderError } from '../providerAdapter.js';
import { db } from '../../../config/database.js';
import { users } from '../../../db/schema/users.js';

describe('AI Provider Failover & Deterministic Fallback Matrix (OpenAI -> Gemini -> Groq -> Deterministic)', () => {
  let testUserId: string;

  const mockPersonalContext: PersonalContext = {
    userId: '',
    userName: 'Test Dry Skin User',
    email: 'dryskin@example.com',
    profile: {
      skinType: 'dry',
      sensitivity: 'medium',
      primaryConcern: 'acne',
      secondaryConcerns: ['dryness', 'dullness', 'redness'],
      ageRange: '18_24',
      gender: 'prefer_not_to_say',
      climate: 'temperate',
      monthlyBudget: 1000,
      currency: 'INR',
      budgetFlexibility: 'strict',
    },
    routines: {
      morning: null,
      evening: {
        id: 'pm-1',
        name: 'Night Routine',
        type: 'evening' as any,
        steps: [
          {
            stepId: 's1',
            productId: 'p1',
            productName: 'Hydrating Cleanser',
            brandName: 'CeraVe',
            category: 'cleanser',
            stepOrder: 1,
            frequency: 'daily',
            ingredients: [],
          },
          {
            stepId: 's2',
            productId: 'p2',
            productName: 'Moisturizing Cream',
            brandName: 'CeraVe',
            category: 'moisturizer',
            stepOrder: 2,
            frequency: 'daily',
            ingredients: [],
          },
        ],
      },
      allProductsUsed: ['Hydrating Cleanser', 'Moisturizing Cream'],
      allActivesUsed: ['Ceramides', 'Hyaluronic Acid'],
    },
    recentRecommendations: [],
    savedProducts: [],
    health: null,
    memory: null,
    provenance: {
      hasProfile: true,
      hasActiveRoutine: true,
      hasHealthConsent: false,
      missingFields: [],
    },
  };

  beforeAll(async () => {
    const [u] = await db
      .insert(users)
      .values({
        name: 'Failover Matrix User',
        email: `failover_user_${Date.now()}@example.com`,
        passwordHash: 'hashed_pw',
      })
      .returning();
    testUserId = u!.id;
    mockPersonalContext.userId = testUserId;
  });

  beforeEach(() => {
    AIProviderManager.resetCooldowns();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    AIProviderManager.resetCooldowns();
  });

  it('Tier 1: Primary OpenAI succeeds and response identifies OpenAI provider', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Personalized OpenAI skincare strategy for dry skin.' } }],
          }),
        },
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(null);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(null);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('OpenAI response');
    expect(result.answer).toContain('Personalized OpenAI skincare strategy');
  });

  it('Tier 2: OpenAI 429 quota exhaustion fails over to Gemini', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const quotaErr = new Error('429 You have no credits remaining');
    (quotaErr as any).status = 429;
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(quotaErr),
        },
      },
    };
    const mockGeminiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Personalized Gemini skincare strategy for dry skin.',
        }),
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(mockGeminiClient);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(null);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Gemini response');
    expect(result.answer).toContain('Personalized Gemini skincare strategy');
    expect(result.failedAttempts).toBeDefined();
    expect(result.failedAttempts?.some((f) => f.provider === 'OpenAI')).toBe(true);
  });

  it('Tier 3: OpenAI 429 and Gemini 429 fail over to Groq', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('429 OpenAI Quota Exceeded')),
        },
      },
    };
    const mockGeminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('429 Gemini Resource Exceeded')),
      },
    };
    const mockGroqClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Personalized Groq skincare strategy for dry skin.' } }],
          }),
        },
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(mockGeminiClient);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(mockGroqClient);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Groq response');
    expect(result.answer).toContain('Personalized Groq skincare strategy');
    expect(result.model).toContain('qwen');
    expect(result.failedAttempts?.length).toBeGreaterThanOrEqual(2);
  });

  it('Tier 4: All 3 live providers fail -> Grounded Deterministic Knowledge Engine succeeds', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('429 OpenAI Quota Exceeded')),
        },
      },
    };
    const mockGeminiClient = {
      models: {
        generateContent: vi.fn().mockRejectedValue(new Error('503 Gemini Service Unavailable')),
      },
    };
    const mockGroqClient = {
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(new Error('429 Groq Rate Limit Exceeded')),
        },
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(mockGeminiClient);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(mockGroqClient);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Grounded knowledge fallback');
    expect(result.model).toBe('deterministic-engine');
    expect(result.answer).toContain('Personalized Winter Xerosis & Barrier Strategy');
    expect(result.failedAttempts?.length).toBe(3);
    // Never leak raw provider trace or error to customer
    expect(result.answer).not.toContain('429');
    expect(result.answer).not.toContain('stack trace');
  });

  it('Skips unconfigured providers smoothly without throwing unhandled exceptions', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    // OpenAI and Gemini unconfigured (null)
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(null);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(null);
    // Groq configured
    const mockGroqClient = {
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'Direct Groq response when earlier providers unconfigured.' } }],
          }),
        },
      },
    };
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(mockGroqClient);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Groq response');
    expect(result.answer).toContain('Direct Groq response');
    expect(result.failedAttempts?.some((f) => f.reason.includes('not configured'))).toBe(true);
  });

  it('Circuit Breaker Cooldown: Bounded retries prevent repeated attempts against an exhausted provider', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const openAICall = vi.fn().mockRejectedValue(new Error('429 Quota Exceeded'));
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: openAICall,
        },
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(null);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(null);

    // Call 1: triggers 429 on OpenAI and sets cooldown
    const res1 = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(res1.provider).toBe('Grounded knowledge fallback');
    expect(openAICall).toHaveBeenCalledTimes(1);

    // Cooldown is active
    expect(AIProviderManager.isProviderInCooldown('openai')).toBe(true);

    // Call 2: immediately skips OpenAI without calling it again
    const res2 = await AIService.askQuestion(testUserId, 'What do you know about my skin profile?');
    expect(res2.provider).toBe('Grounded knowledge fallback');
    // OpenAICall should NOT have been called again!
    expect(openAICall).toHaveBeenCalledTimes(1);
    expect(res2.failedAttempts?.some((f) => f.reason.includes('cooldown'))).toBe(true);
  });

  it('Transient 5xx / timeout triggers failover', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    const mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI request timed out')), 20))),
        },
      },
    };
    const mockGeminiClient = {
      models: {
        generateContent: vi.fn().mockResolvedValue({
          text: 'Gemini recovered after OpenAI timeout.',
        }),
      },
    };
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(mockOpenAIClient);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(mockGeminiClient);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(null);

    const result = await AIService.askQuestion(testUserId, 'How can I deal with dry skin in winters?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Gemini response');
    expect(result.answer).toContain('Gemini recovered after OpenAI timeout');
  });

  it('Non-retryable user validation error is rethrown and does NOT fail over to other LLMs', async () => {
    const valErr = new Error('Context length exceeded: validation failed on user input');
    (valErr as any).name = 'ValidationError';

    expect(isUserValidationError(valErr)).toBe(true);

    const mockOpts = {
      systemPrompt: 'prompt',
      question: 'long invalid input',
      personalContext: mockPersonalContext,
      engineResults: {},
      retrievedChunks: [],
    };

    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue({
      chat: {
        completions: {
          create: vi.fn().mockRejectedValue(valErr),
        },
      },
    });
    const geminiMock = vi.fn();
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue({
      models: {
        generateContent: geminiMock,
      },
    });

    await expect(AIProviderManager.execute(mockOpts as any)).rejects.toThrow('validation failed');
    // Gemini should NOT be attempted when user validation fails
    expect(geminiMock).not.toHaveBeenCalled();
  });

  it('Sanitizes sensitive API keys and tokens in error telemetry', () => {
    const dirtyError = 'Failed: sk-proj-1234567890abcdef1234567890 at gsk_secretkey1234567890abcdef with AIzaSyTestKey1234567890 and user@secret.com';
    const cleanError = sanitizeProviderError(dirtyError);
    expect(cleanError).not.toContain('sk-proj-');
    expect(cleanError).not.toContain('gsk_secretkey');
    expect(cleanError).not.toContain('AIzaSyTest');
    expect(cleanError).not.toContain('user@secret.com');
    expect(cleanError).toContain('[REDACTED_API_KEY]');
    expect(cleanError).toContain('[REDACTED_EMAIL]');
  });

  it('Maintains identical personal context and profile data across fallback answers', async () => {
    vi.spyOn(PersonalContextService, 'getPersonalContext').mockResolvedValue(mockPersonalContext);
    vi.spyOn(AIService as any, 'getOpenAIClient').mockReturnValue(null);
    vi.spyOn(AIService as any, 'getGeminiClient').mockReturnValue(null);
    vi.spyOn(AIService as any, 'getGroqClient').mockReturnValue(null);

    const result = await AIService.askQuestion(testUserId, 'What do you know about my skin profile?');
    expect(result.status).toBe('SUCCESS');
    expect(result.provider).toBe('Grounded knowledge fallback');
    expect(result.intent).toBe('SKIN_PROFILE_INQUIRY');
    expect(result.answer).toContain('Your Verified SkinAI Profile');
    expect(result.answer).toContain('DRY');
    expect(result.answer).toContain('MEDIUM');
    expect(result.answer).toContain('ACNE');
    expect(result.answer).toContain('18–24');
    expect(result.answer).toContain('INR 1000');
  });

  it('Question 4 Intent: "What should I change in my current routine?" triggers ROUTINE_EVALUATION', () => {
    const intent = AIOrchestratorService.classifyIntent('What should I change in my current routine?');
    expect(intent).toBe('ROUTINE_EVALUATION');
  });

  it('Question 3 Intent: "What do you know about my skin profile?" triggers SKIN_PROFILE_INQUIRY', () => {
    const intent = AIOrchestratorService.classifyIntent('What do you know about my skin profile?');
    expect(intent).toBe('SKIN_PROFILE_INQUIRY');
  });

  it('Circuit Breaker accurately categorizes provider errors and assigns tailored cooldowns', () => {
    const quotaBilling = categorizeProviderError(new Error('429 You have no credits remaining'));
    expect(quotaBilling.category).toBe('BILLING_EXHAUSTED');
    expect(quotaBilling.cooldownMs).toBe(600_000);

    const rateLimit = categorizeProviderError(new Error('429 Rate limit reached'));
    expect(rateLimit.category).toBe('RATE_LIMITED');
    expect(rateLimit.cooldownMs).toBe(30_000);

    const creds = categorizeProviderError(new Error('401 Invalid API key'));
    expect(creds.category).toBe('INVALID_CREDENTIALS');
    expect(creds.cooldownMs).toBe(600_000);

    const modelNotFound = categorizeProviderError(new Error('404 model_not_found'));
    expect(modelNotFound.category).toBe('INVALID_MODEL');
    expect(modelNotFound.cooldownMs).toBe(300_000);

    const serverErr = categorizeProviderError(new Error('503 Service Unavailable'));
    expect(serverErr.category).toBe('TRANSIENT_SERVER_ERROR');
    expect(serverErr.cooldownMs).toBe(15_000);
  });
});
