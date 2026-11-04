import { OpenAI } from 'openai';
import { GoogleGenAI } from '@google/genai';
import { db } from '../../config/database.js';
import { knowledgeEmbeddings, aiConversations, aiMessages, userHealthContexts, userMemories } from '../../db/schema/ai.js';
import { RoutineAnalysisService } from '../routines/analysis.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { PersonalContextService, PersonalContext } from './personalContext.service.js';
import { AIOrchestratorService, EngineExecutionResults, UserIntent } from './aiOrchestrator.service.js';
import { AIProviderManager } from './providerAdapter.js';
import { ConversationType, MessageRole } from '../../shared/types/enums.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../../config/logger.js';

export interface RetrievedChunk {
  title: string;
  content: string;
  sourceType: string;
  sourceId: string;
  domain?: string;
  evidenceQuality?: string;
}

export class AIService {
  static getOpenAIClient(): OpenAI | null {
    if (process.env.NODE_ENV === 'test' && !process.env.LIVE_AI_TESTS) {
      return null;
    }
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.startsWith('sk-placeholder') || key === 'your-openai-api-key' || key.trim() === '') {
      return null;
    }
    return new OpenAI({ apiKey: key });
  }

  static getGeminiClient(): GoogleGenAI | null {
    if (process.env.NODE_ENV === 'test' && !process.env.LIVE_AI_TESTS) {
      return null;
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.startsWith('your-') || key.startsWith('placeholder') || key === 'AIza-placeholder' || key.trim() === '') {
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey: key });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to initialize GoogleGenAI client');
      return null;
    }
  }

  static getGroqClient(): OpenAI | null {
    if (process.env.NODE_ENV === 'test' && !process.env.LIVE_AI_TESTS) {
      return null;
    }
    const key = process.env.GROQ_API_KEY;
    if (!key || key.startsWith('your-') || key.startsWith('gsk-placeholder') || key.trim() === '') {
      return null;
    }
    try {
      return new OpenAI({
        apiKey: key,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to initialize Groq client');
      return null;
    }
  }

  /**
   * Semantic / Keyword retrieval of relevant knowledge chunks from PostgreSQL
   * Searches conventional dermatology, Ayurvedic records, active ingredients, and interactions.
   */
  static async retrieveRelevantKnowledge(query: string, limit = 4): Promise<RetrievedChunk[]> {
    const client = this.getOpenAIClient();

    // 1. Attempt vector similarity search if embeddings can be generated
    if (client) {
      try {
        const embeddingRes = await client.embeddings.create({
          model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
          input: query,
        });
        const queryVector = embeddingRes.data[0]?.embedding;
        if (queryVector && queryVector.length === 1536) {
          const vectorStr = `[${queryVector.join(',')}]`;
          const results = await db.execute<{
            title: string;
            content: string;
            source_type: string;
            source_id: string;
            metadata: any;
            similarity: number;
          }>(sql`
            SELECT title, content, source_type, source_id, metadata, 1 - (embedding <=> ${vectorStr}::vector) AS similarity
            FROM knowledge_embeddings
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${limit}
          `);

          if (results && results.length > 0) {
            return results.map((r) => ({
              title: r.title,
              content: r.content,
              sourceType: r.source_type,
              sourceId: r.source_id,
              domain: (r.metadata as any)?.domain || 'conventional_dermatology',
              evidenceQuality: (r.metadata as any)?.evidenceQuality || 'Strong',
            }));
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Vector embedding unavailable; falling back to database text retrieval');
      }
    }

    // 2. Keyword & Text Search on PostgreSQL
    const STOP_WORDS = new Set([
      'the', 'and', 'for', 'with', 'can', 'how', 'what', 'when', 'why', 'use', 'using',
      'combine', 'combining', 'apply', 'applying', 'should', 'could', 'would', 'does',
      'from', 'into', 'your', 'have', 'been', 'this', 'that', 'they', 'them', 'about',
      'skin', 'skincare', 'routine', 'face', 'forehead', 'together', 'good', 'best'
    ]);
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const allChunks = await db.select().from(knowledgeEmbeddings).limit(50);
    const scored = allChunks.map((chunk) => {
      let score = 0;
      const titleLower = chunk.title.toLowerCase();
      const contentLower = chunk.content.toLowerCase();
      for (const word of words) {
        if (titleLower.includes(word)) score += 4;
        if (contentLower.includes(word)) score += 1.5;
      }

      // Bonus for domain matching
      if (lowerQuery.includes('winter') && titleLower.includes('winter')) score += 5;
      if (lowerQuery.includes('neem') && titleLower.includes('neem')) score += 5;
      if ((lowerQuery.includes('turmeric') || lowerQuery.includes('haldi')) && titleLower.includes('turmeric')) score += 5;
      if (lowerQuery.includes('kumkumadi') && titleLower.includes('kumkumadi')) score += 5;
      if (lowerQuery.includes('retinol') && titleLower.includes('retinoid')) score += 4;

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const filtered = scored.filter((s) => s.score >= 3);
    const chosen = filtered.slice(0, limit);

    return chosen.map((s) => ({
      title: s.chunk.title,
      content: s.chunk.content,
      sourceType: s.chunk.sourceType,
      sourceId: s.chunk.sourceId,
      domain: (s.chunk.metadata as any)?.domain || 'conventional_dermatology',
      evidenceQuality: (s.chunk.metadata as any)?.evidenceQuality || 'Strong',
    }));
  }

  /**
   * Ask skincare education and personalized advisory question
   * Flow:
   * 1. Authenticate & load complete user personal context (profile, routines, analysis, consented health, memory)
   * 2. Identify intent & run deterministic engines (Routine Analysis, Candidate Filter, Ranking Engine, Conflict Detection)
   * 3. Retrieve relevant supporting knowledge (Dermatology + Ayurveda)
   * 4. Multi-provider execution:
   *    - Primary: OpenAI (if valid key & credits)
   *    - Secondary: Google Gemini API (if configured)
   *    - Deterministic Personal Fallback: AIOrchestratorService.synthesizeDeterministicAnswer
   * 5. Persist conversation, message, and long-term memory
   */
  static async askQuestion(userId: string, question: string, conversationId?: string) {
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    // 1. Load Authenticated User's Personal Context
    const personalContext: PersonalContext = await PersonalContextService.getPersonalContext(userId);

    // 2. Classify Intent
    const intent: UserIntent = AIOrchestratorService.classifyIntent(question);

    // 3. Execute Existing Deterministic Intelligence Engines
    const engineResults: EngineExecutionResults = await AIOrchestratorService.executeEngines(
      userId,
      intent,
      question,
      personalContext
    );

    // 4. Retrieve Supporting Knowledge Chunks
    let retrievedChunks: RetrievedChunk[] = [];
    if (
      intent !== 'SKIN_PROFILE_INQUIRY' &&
      intent !== 'CONVERSATION_MEMORY' &&
      intent !== 'ROUTINE_EVALUATION' &&
      intent !== 'PRODUCT_RECOMMENDATION'
    ) {
      retrievedChunks = await this.retrieveRelevantKnowledge(question);
    }

    // 5. Manage Conversation
    let convId = conversationId;
    if (!convId) {
      const [conv] = await db
        .insert(aiConversations)
        .values({
          userId,
          conversationType: ConversationType.GENERAL,
          title: question.slice(0, 80),
          contextSnapshot: {
            skinType: personalContext.profile.skinType,
            primaryConcern: personalContext.profile.primaryConcern,
            intent,
            routinesCount: (personalContext.routines.morning ? 1 : 0) + (personalContext.routines.evening ? 1 : 0),
          },
        })
        .returning();
      convId = conv!.id;
    } else {
      // Validate conversation ownership (Strict IDOR protection)
      const [existingConv] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, convId))
        .limit(1);

      if (!existingConv || existingConv.userId !== userId) {
        const forbiddenErr = new Error('Forbidden');
        (forbiddenErr as any).statusCode = 403;
        throw forbiddenErr;
      }
    }

    // Save User Message
    await db.insert(aiMessages).values({
      conversationId: convId!,
      role: MessageRole.USER,
      content: question,
    });

    // 6. Build Rich System Prompt
    const promptPersonalContext = PersonalContextService.formatForPrompt(personalContext);

    let engineInsightsText = `=== DETERMINISTIC ENGINE OUTPUTS ===\nIntent: ${intent}\n`;
    if (engineResults.routineAnalysis) {
      engineInsightsText += `Routine Health Score: ${engineResults.routineAnalysis.overallScore}/100 (${engineResults.routineAnalysis.confidence})\n`;
      engineInsightsText += `Conflicts: ${engineResults.routineAnalysis.conflicts.length} | Cautions: ${engineResults.routineAnalysis.cautions.length} | Synergies: ${engineResults.routineAnalysis.synergies.length}\n`;
    }
    if (engineResults.recommendedCandidates && engineResults.recommendedCandidates.length > 0) {
      engineInsightsText += `Top Ranked Catalog Products:\n` +
        engineResults.recommendedCandidates
          .map((c) => `- ${c.name} (${c.brandName}) Price: ${c.currency} ${c.price} | Score: ${c.score} | Reason: ${c.reason}`)
          .join('\n') + '\n';
    }
    if (engineResults.matchedInteraction) {
      const mi = engineResults.matchedInteraction;
      engineInsightsText += `Clinical Interaction: ${mi.ingredientA} + ${mi.ingredientB} -> ${mi.type.toUpperCase()} (Severity: ${mi.severity})\n`;
      engineInsightsText += `Same Routine OK: ${mi.sameRoutineOk} | Same Day OK: ${mi.sameDayOk}\n`;
      engineInsightsText += `Explanation: ${mi.explanation}\nRecommendation: ${mi.recommendation}\n`;
    }
    engineInsightsText += `=== END ENGINE OUTPUTS ===`;

    const knowledgeText = retrievedChunks.length > 0
      ? retrievedChunks
          .map((c) => `[Topic: ${c.title} | Domain: ${c.domain || 'Dermatology'} | Quality: ${c.evidenceQuality || 'Strong'}]\n${c.content}`)
          .join('\n\n')
      : 'No specific knowledge articles found in database for this query.';

    const systemPrompt = `You are SkinAI's Certified Skincare & Dermatology Intelligence Advisor.
Follow these clinical guidelines strictly:
1. Always ground your advice in the provided Personal Context and Deterministic Engine Outputs.
2. Adhere to the user's specific skin characteristics: Skin Type, Sensitivity level, and primary/secondary concerns.
3. If the user mentions budgets or asks for product recommendations, use the verified catalog candidates provided by the engine. Never invent products.
4. When discussing traditional Ayurvedic herbs (Neem, Turmeric, Kumkumadi Tailam, Gotu Kola, Sandalwood), clearly distinguish traditional practices from peer-reviewed clinical evidence. Highlight known contraindications (e.g. comedogenicity of oils for acne, pure neem sensitization).
5. Safety boundary: Do NOT diagnose medical skin conditions. If user shares prescription medications (Tretinoin, Steroids, Accutane), warn against direct acid conflicts.
6. Honest transparency: Do not claim routine analysis scores if user has no routine saved.
7. Tone: Warm, scientifically accurate, objective, and empowering.

${promptPersonalContext}

${engineInsightsText}

Retrieved Knowledge Base:
${knowledgeText}`;

    // Multi-Provider Strategy Execution via AIProviderManager
    const providerResult = await AIProviderManager.execute({
      systemPrompt,
      question,
      personalContext,
      engineResults,
      retrievedChunks,
    });

    const answer = providerResult.answer;
    const providerName = providerResult.provider;
    const modelName = providerResult.model;

    // Strict Source Attribution: profile, memory, routine & product intents do not take literature sources
    // Also, if answer states no matching records exist, never contradict with literature citations
    let sourcesToReturn: RetrievedChunk[] = [];
    if (
      intent !== 'SKIN_PROFILE_INQUIRY' &&
      intent !== 'CONVERSATION_MEMORY' &&
      intent !== 'ROUTINE_EVALUATION' &&
      intent !== 'PRODUCT_RECOMMENDATION' &&
      !answer.includes('Clinical Knowledge Base Notice')
    ) {
      if (providerName === 'Grounded knowledge fallback' && providerResult.sources !== undefined) {
        sourcesToReturn = providerResult.sources;
      } else if (providerName === 'Grounded knowledge fallback') {
        sourcesToReturn = retrievedChunks.filter(
          (c) =>
            ((c.domain === 'ayurveda' || c.domain === 'integrative') && intent === 'AYURVEDA_INQUIRY') ||
            (c.title.toLowerCase().includes('winter') && intent === 'WINTER_DRY_SKIN') ||
            (c.title.toLowerCase().includes('barrier') && (intent === 'WINTER_DRY_SKIN' || intent === 'ACNE_DRY_BALANCE')) ||
            (c.title.toLowerCase().includes('acne') && (intent === 'IMPROVE_SKIN_QUALITY' || intent === 'ACNE_DRY_BALANCE')) ||
            (c.sourceId === 'skin-quality-barrier-texture' && (intent === 'IMPROVE_SKIN_QUALITY' || intent === 'GENERAL_SKINCARE')) ||
            intent === 'HEALTH_MEDICATION' ||
            intent === 'INGREDIENT_INTERACTION'
        );
      } else {
        sourcesToReturn = retrievedChunks;
      }
    }

    // Persist Assistant Message
    await db.insert(aiMessages).values({
      conversationId: convId!,
      role: MessageRole.ASSISTANT,
      content: answer || '',
      metadata: {
        model: modelName,
        provider: providerName,
        retrievedChunks: sourcesToReturn.length,
        sources: sourcesToReturn,
        intent,
        failedAttempts: providerResult.failedAttempts || [],
      },
    });

    // Update conversation timestamp
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, convId));

    // Update Long-Term Memory with provenance (synchronously awaited to avoid race conditions)
    try {
      await this.updateUserMemoryFromInteraction(userId, question, answer, convId!);
    } catch (err: any) {
      logger.debug({ err: err.message }, 'User memory update ignored');
    }

    return {
      conversationId: convId,
      status: 'SUCCESS',
      provider: providerName,
      model: modelName,
      intent,
      answer,
      sources: sourcesToReturn,
      failedAttempts: providerResult.failedAttempts,
      personalContext: {
        skinType: personalContext.profile.skinType,
        primaryConcern: personalContext.profile.primaryConcern,
        monthlyBudget: personalContext.profile.monthlyBudget,
        currency: personalContext.profile.currency,
        hasRoutine: personalContext.provenance.hasActiveRoutine,
      },
      engineResults: {
        routineHealthScore: engineResults.routineAnalysis?.overallScore ?? null,
        recommendedCount: engineResults.recommendedCandidates?.length ?? 0,
      },
    };
  }

  /**
   * Plain-language explanation of a deterministic routine analysis
   */
  static async explainRoutineAnalysis(userId: string, routineId: string) {
    // 1. Enforce routine ownership
    await RoutinesService.getRoutineById(userId, routineId);

    // 2. Load latest analysis
    const analysis = await RoutineAnalysisService.getLatestAnalysis(userId, routineId);
    if (!analysis) {
      throw new Error('Routine has not been analyzed yet. Please run an analysis first.');
    }

    // 3. Construct deterministic explanation grounded in actual analysis facts
    const rawIssues = (analysis.issues as any[]) || [];
    const conflicts = rawIssues.filter((i: any) => (i.type || '').toUpperCase() === 'CONFLICT');
    const cautions = rawIssues.filter((i: any) => (i.type || '').toUpperCase() === 'CAUTION');
    const synergies = rawIssues.filter((i: any) => (i.type || '').toUpperCase() === 'SYNERGY');
    const redundancies = rawIssues.filter((i: any) => (i.type || '').toUpperCase() === 'REDUNDANCY');

    let explanation = `Routine Health Score: ${analysis.overallScore}/100 (${analysis.confidence} confidence).\n\n`;

    if (conflicts.length > 0) {
      explanation += `⚠️ High-Risk Conflicts Detected (${conflicts.length}):\n`;
      for (const c of conflicts) {
        explanation += `- ${c.rule?.explanation || c.message || c.title || 'Ingredient conflict'} Recommendation: ${
          c.rule?.recommendation || c.recommendation || 'Separate usage.'
        }\n`;
      }
      explanation += '\n';
    } else {
      explanation += '✅ No direct ingredient conflicts were detected.\n\n';
    }

    if (synergies.length > 0) {
      explanation += `✨ Beneficial Synergies (${synergies.length}):\n`;
      for (const s of synergies) {
        explanation += `- ${s.rule?.explanation || s.message || s.title || 'Complimentary active pairing.'}\n`;
      }
      explanation += '\n';
    }

    if (cautions.length > 0) {
      explanation += `💡 Application Cautions (${cautions.length}):\n`;
      for (const c of cautions) {
        explanation += `- ${c.rule?.explanation || c.issue || c.message || c.title || 'Watch for potential irritation.'}\n`;
      }
      explanation += '\n';
    }

    if (redundancies.length > 0) {
      explanation += `🔄 Redundant Steps (${redundancies.length}):\n`;
      for (const _r of redundancies) {
        explanation += `- Multiple products provide overlapping functions. Consider simplifying.\n`;
      }
    }

    return {
      routineId,
      overallScore: analysis.overallScore,
      confidence: analysis.confidence,
      breakdown: analysis.breakdown,
      explanation,
      conflicts,
      synergies,
      cautions,
    };
  }

  /**
   * Get user's AI conversations (scoped strictly to authenticated user)
   */
  static async getUserConversations(userId: string) {
    return db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  /**
   * Get messages for a specific conversation with IDOR ownership check
   */
  static async getConversationMessages(userId: string, conversationId: string) {
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new Error('Conversation not found');
    }

    if (conv.userId !== userId) {
      const err = new Error('Forbidden');
      (err as any).statusCode = 403;
      throw err;
    }

    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);

    return {
      conversation: conv,
      messages,
    };
  }

  /**
   * Delete a conversation and its messages with IDOR ownership check
   */
  static async deleteConversation(userId: string, conversationId: string) {
    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new Error('Conversation not found');
    }

    if (conv.userId !== userId) {
      const err = new Error('Forbidden');
      (err as any).statusCode = 403;
      throw err;
    }

    // Cascade handles messages, but delete explicitly for safety
    await db.delete(aiMessages).where(eq(aiMessages.conversationId, conversationId));
    await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));

    return { success: true };
  }

  /**
   * Get consented health context for authenticated user
   */
  static async getHealthContext(userId: string) {
    const [row] = await db
      .select()
      .from(userHealthContexts)
      .where(eq(userHealthContexts.userId, userId))
      .limit(1);

    const hasConsent = Boolean(row?.hasConsent);
    const allergies = (row?.allergies as string[]) || [];
    const skinConditions = (row?.skinConditions as string[]) || [];
    const medications = (row?.medications as string[]) || [];
    const previousReactions = (row?.previousReactions as string[]) || [];

    return {
      userId,
      hasConsent,
      consentGiven: hasConsent,
      allergies,
      skinConditions,
      diagnosedSkinConditions: skinConditions,
      medicalConditions: skinConditions,
      medications,
      currentMedications: medications,
      previousReactions,
      adverseReactions: previousReactions,
      notes: row?.notes || null,
      consentDate: row?.consentDate || null,
    };
  }

  /**
   * Update or upsert consented health context
   */
  static async updateHealthContext(
    userId: string,
    data: {
      hasConsent?: boolean;
      consentGiven?: boolean;
      allergies?: string[];
      skinConditions?: string[];
      diagnosedSkinConditions?: string[];
      medicalConditions?: string[];
      medications?: string[];
      currentMedications?: string[];
      previousReactions?: string[];
      adverseReactions?: string[];
      notes?: string;
    }
  ) {
    const hasConsent = Boolean(data.hasConsent ?? data.consentGiven ?? false);
    const allergies = data.allergies || [];
    const skinConditions = data.skinConditions || data.diagnosedSkinConditions || data.medicalConditions || [];
    const medications = data.medications || data.currentMedications || [];
    const previousReactions = data.previousReactions || data.adverseReactions || [];
    const notes = data.notes || null;

    const [existing] = await db
      .select()
      .from(userHealthContexts)
      .where(eq(userHealthContexts.userId, userId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(userHealthContexts)
        .set({
          hasConsent,
          consentDate: hasConsent ? new Date() : null,
          allergies,
          skinConditions,
          medications,
          previousReactions,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(userHealthContexts.userId, userId))
        .returning();
      if (!updated) return null;
      return {
        ...updated,
        consentGiven: updated.hasConsent,
        currentMedications: updated.medications,
        diagnosedSkinConditions: updated.skinConditions,
        medicalConditions: updated.skinConditions,
        adverseReactions: updated.previousReactions,
      };
    } else {
      const [inserted] = await db
        .insert(userHealthContexts)
        .values({
          userId,
          hasConsent,
          consentDate: hasConsent ? new Date() : null,
          allergies,
          skinConditions,
          medications,
          previousReactions,
          notes,
        })
        .returning();
      if (!inserted) return null;
      return {
        ...inserted,
        consentGiven: inserted.hasConsent,
        currentMedications: inserted.medications,
        diagnosedSkinConditions: inserted.skinConditions,
        medicalConditions: inserted.skinConditions,
        adverseReactions: inserted.previousReactions,
      };
    }
  }

  /**
   * Clear health context & revoke consent
   */
  static async clearHealthContext(userId: string) {
    await db.delete(userHealthContexts).where(eq(userHealthContexts.userId, userId));
    return { success: true };
  }

  /**
   * Get user conversational memories with provenance and UI aliases
   */
  static async getUserMemory(userId: string) {
    const [row] = await db.select().from(userMemories).where(eq(userMemories.userId, userId)).limit(1);
    if (!row) {
      return null;
    }

    const rawTried = (row.triedProducts as any[]) || [];
    const productOutcomes = rawTried.map((t: any) => {
      if (typeof t === 'string') {
        return { productName: t, outcome: 'Reported product experience' };
      }
      return {
        productName: t.productName || 'Product',
        outcome: t.outcome || (t.reaction ? `Reported reaction: ${t.reaction}` : 'Used'),
        reaction: t.reaction || null,
        isAdverse: Boolean(t.isAdverse),
        provenance: t.provenance || null,
        recordedAt: t.recordedAt || null,
      };
    });

    const preferences = (row.statedPreferences as Record<string, any>) || {};
    const avoided = ((preferences.avoidedIngredients as string[]) || (row.confirmedSensitivities as string[]) || []);

    return {
      ...row,
      preferences,
      avoidedIngredients: avoided,
      productOutcomes,
      memorySummary: row.summary,
    };
  }

  /**
   * Update or correct user conversational memory directly (User Controls)
   */
  static async updateUserMemory(
    userId: string,
    data: {
      statedPreferences?: Record<string, any>;
      preferences?: Record<string, any>;
      confirmedSensitivities?: string[];
      avoidedIngredients?: string[];
      triedProducts?: any[];
      productOutcomes?: any[];
      summary?: string;
      memorySummary?: string;
    }
  ) {
    const [existing] = await db.select().from(userMemories).where(eq(userMemories.userId, userId)).limit(1);

    const preferences = {
      ...((existing?.statedPreferences as Record<string, any>) || {}),
      ...(data.statedPreferences || data.preferences || {}),
    };
    if (data.avoidedIngredients) {
      preferences.avoidedIngredients = data.avoidedIngredients;
    }

    const triedProducts = data.triedProducts || data.productOutcomes || (existing?.triedProducts as any[]) || [];
    const confirmedSensitivities = data.confirmedSensitivities || (existing?.confirmedSensitivities as string[]) || [];
    const summary = data.summary || data.memorySummary || existing?.summary || 'User conversational preferences recorded.';

    if (existing) {
      const [updated] = await db
        .update(userMemories)
        .set({
          statedPreferences: preferences,
          confirmedSensitivities,
          triedProducts,
          summary,
          lastUpdated: new Date(),
        })
        .where(eq(userMemories.userId, userId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(userMemories)
        .values({
          userId,
          statedPreferences: preferences,
          confirmedSensitivities,
          triedProducts,
          summary,
        })
        .returning();
      return inserted;
    }
  }

  /**
   * Clear user conversational memory
   */
  static async clearUserMemory(userId: string) {
    await db.delete(userMemories).where(eq(userMemories.userId, userId));
    return { success: true };
  }

  /**
   * Internal helper: update memory from user interaction with provenance and correction resolution
   */
  private static async updateUserMemoryFromInteraction(
    userId: string,
    question: string,
    answer: string,
    conversationId?: string
  ) {
    const [existing] = await db.select().from(userMemories).where(eq(userMemories.userId, userId)).limit(1);

    const importantAdvice = existing ? (existing.importantAdviceGiven as string[]) || [] : [];
    const firstLine = answer.split('\n').find((l) => l.startsWith('**') || l.startsWith('•') || l.startsWith('1.'));
    if (firstLine && !importantAdvice.includes(firstLine)) {
      importantAdvice.push(firstLine.slice(0, 150));
      if (importantAdvice.length > 5) importantAdvice.shift();
    }

    let triedProducts: any[] = existing ? (existing.triedProducts as any[]) || [] : [];
    let confirmedSensitivities: string[] = existing ? (existing.confirmedSensitivities as string[]) || [] : [];

    const cleanStr = (s?: string) => (s ? s.trim().replace(/[.,;!?]+$/, '').trim() : '');

    // Pattern 2: User correction "Actually, it was Product Y that caused irritation, Product X was fine" or "Actually Product Y caused irritation, Product X was fine" or "Actually Product Y caused irritation, not Product X"
    const correctionMatch =
      question.match(
        /(?:actually|correction|mistake|wait|sorry)[,\s]+(?:it\s+was\s+)?([A-Za-z0-9\s\-]+?)\s+(?:that\s+caused|caused|triggered)\s+([A-Za-z0-9\s]+?)[,\s]+(?:and\s+)?([A-Za-z0-9\s\-]+?)\s+was\s+(?:fine|okay|ok|good|tolerated)/i
      ) ||
      question.match(
        /(?:actually|correction|mistake|wait|sorry)[,\s]+(?:it\s+was\s+)?([A-Za-z0-9\s\-]+?)\s+(?:that\s+caused|caused|triggered)\s+([A-Za-z0-9\s]+?)[,\s]+not\s+([A-Za-z0-9\s\-]+)/i
      );

    // Pattern 1: User statement "I tried Product X and it caused irritation"
    const adverseMatch =
      question.match(
        /(?:i\s+(?:tried|used|applied)\s+([A-Za-z0-9\s\-]+?)\s+(?:and\s+it\s+caused|and\s+got|and\s+had|and\s+it\s+gave\s+me|with)\s+([A-Za-z0-9\s]+))/i
      ) ||
      question.match(
        /(?:([A-Za-z0-9\s\-]+?)\s+(?:caused|triggered|gave\s+me)\s+(irritation|breakouts?|redness|acne|rash|burning|stinging))/i
      );

    if (correctionMatch) {
      const adverseProd = cleanStr(correctionMatch[1]);
      const reaction = cleanStr(correctionMatch[2]) || 'irritation';
      const fineProd = cleanStr(correctionMatch[3]);

      // Update fine product to not adverse
      if (fineProd) {
        const fineIdx = triedProducts.findIndex(
          (p: any) => (p.productName || p).toLowerCase() === fineProd.toLowerCase()
        );
        const record = {
          productName: fineProd,
          outcome: 'tolerated well / fine',
          reaction: 'none',
          isAdverse: false,
          provenance: {
            conversationId: conversationId || null,
            timestamp: new Date().toISOString(),
            type: 'explicit_user_correction',
          },
          recordedAt: new Date().toISOString(),
        };
        if (fineIdx >= 0) {
          triedProducts[fineIdx] = record;
        } else {
          triedProducts.push(record);
        }
      }

      // Record adverse product
      if (adverseProd) {
        const advIdx = triedProducts.findIndex(
          (p: any) => (p.productName || p).toLowerCase() === adverseProd.toLowerCase()
        );
        const record = {
          productName: adverseProd,
          outcome: `caused ${reaction}`,
          reaction,
          isAdverse: true,
          provenance: {
            conversationId: conversationId || null,
            timestamp: new Date().toISOString(),
            type: 'explicit_user_correction',
          },
          recordedAt: new Date().toISOString(),
        };
        if (advIdx >= 0) {
          triedProducts[advIdx] = record;
        } else {
          triedProducts.push(record);
        }
        if (!confirmedSensitivities.includes(reaction)) {
          confirmedSensitivities.push(reaction);
        }
      }
    } else if (adverseMatch) {
      const prodName = cleanStr(adverseMatch[1] || adverseMatch[3]);
      const reaction = cleanStr(adverseMatch[2] || adverseMatch[4]) || 'irritation';

      if (prodName) {
        const existingIdx = triedProducts.findIndex(
          (p: any) => (p.productName || p).toLowerCase() === prodName.toLowerCase()
        );
        const record = {
          productName: prodName,
          outcome: `caused ${reaction}`,
          reaction,
          isAdverse: true,
          provenance: {
            conversationId: conversationId || null,
            timestamp: new Date().toISOString(),
            type: 'explicit_user_statement',
          },
          recordedAt: new Date().toISOString(),
        };
        if (existingIdx >= 0) {
          triedProducts[existingIdx] = record;
        } else {
          triedProducts.push(record);
        }
        if (!confirmedSensitivities.includes(reaction)) {
          confirmedSensitivities.push(reaction);
        }
      }
    }

    const summaryText = `Consultation on: "${question.slice(0, 100)}"`;

    if (existing) {
      await db
        .update(userMemories)
        .set({
          importantAdviceGiven: importantAdvice,
          triedProducts,
          confirmedSensitivities,
          summary: summaryText,
          lastUpdated: new Date(),
        })
        .where(eq(userMemories.userId, userId));
    } else {
      await db.insert(userMemories).values({
        userId,
        importantAdviceGiven: importantAdvice,
        triedProducts,
        confirmedSensitivities,
        summary: summaryText,
      });
    }
  }
}
