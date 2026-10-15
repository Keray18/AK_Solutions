import { OpenAI } from 'openai';
import { db } from '../../config/database.js';
import { knowledgeEmbeddings, aiConversations, aiMessages } from '../../db/schema/ai.js';
import { RoutineAnalysisService } from '../routines/analysis.service.js';
import { RoutinesService } from '../routines/routines.service.js';
import { ConversationType, MessageRole } from '../../shared/types/enums.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../../config/logger.js';

export interface RetrievedChunk {
  title: string;
  content: string;
  sourceType: string;
  sourceId: string;
}

export class AIService {
  private static getOpenAIClient(): OpenAI | null {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.startsWith('sk-placeholder') || key === 'your-openai-api-key') {
      return null;
    }
    return new OpenAI({ apiKey: key });
  }

  /**
   * Semantic retrieval of relevant knowledge chunks from PostgreSQL
   */
  static async retrieveRelevantKnowledge(query: string, limit = 3): Promise<RetrievedChunk[]> {
    const client = this.getOpenAIClient();
    
    // Attempt vector similarity search if embeddings can be generated
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
            similarity: number;
          }>(sql`
            SELECT title, content, source_type, source_id, 1 - (embedding <=> ${vectorStr}::vector) AS similarity
            FROM knowledge_embeddings
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${limit}
          `);

          if (results && results.length > 0) {
            return results.map(r => ({
              title: r.title,
              content: r.content,
              sourceType: r.source_type,
              sourceId: r.source_id,
            }));
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'pgvector semantic search fallback triggered');
      }
    }

    // Keyword / fallback text search on knowledge_embeddings
    const lowerQuery = query.toLowerCase();
    const allChunks = await db.select().from(knowledgeEmbeddings).limit(20);
    const scored = allChunks.map(chunk => {
      let score = 0;
      const titleLower = chunk.title.toLowerCase();
      const contentLower = chunk.content.toLowerCase();
      const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
      for (const word of words) {
        if (titleLower.includes(word)) score += 3;
        if (contentLower.includes(word)) score += 1;
      }
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => ({
      title: s.chunk.title,
      content: s.chunk.content,
      sourceType: s.chunk.sourceType,
      sourceId: s.chunk.sourceId,
    }));
  }

  /**
   * Ask skincare education question with retrieval grounding
   */
  static async askQuestion(userId: string, question: string, conversationId?: string) {
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    // 1. Retrieve knowledge
    const retrievedChunks = await this.retrieveRelevantKnowledge(question);

    // 2. Manage or create conversation
    let convId = conversationId;
    if (!convId) {
      const [conv] = await db.insert(aiConversations).values({
        userId,
        conversationType: ConversationType.GENERAL,
        title: question.slice(0, 80),
      }).returning();
      convId = conv!.id;
    } else {
      // Validate conversation ownership
      const [existingConv] = await db.select().from(aiConversations)
        .where(eq(aiConversations.id, convId))
        .limit(1);
      if (!existingConv || existingConv.userId !== userId) {
        throw new Error('Conversation not found or access forbidden');
      }
    }

    // 3. Save User Message
    await db.insert(aiMessages).values({
      conversationId: convId,
      role: MessageRole.USER,
      content: question,
    });

    // 4. Try OpenAI completion
    const client = this.getOpenAIClient();
    if (!client) {
      const fallbackMsg = 'OpenAI API key is not configured. Deterministic features remain fully functional. Set OPENAI_API_KEY in backend/.env to activate live generative responses.';
      await db.insert(aiMessages).values({
        conversationId: convId,
        role: MessageRole.ASSISTANT,
        content: fallbackMsg,
        metadata: { retrievedChunks: retrievedChunks.length },
      });

      return {
        conversationId: convId,
        status: 'UNCONFIGURED',
        answer: fallbackMsg,
        sources: retrievedChunks,
        requiresConfiguration: true,
      };
    }

    try {
      const contextText = retrievedChunks.length > 0
        ? retrievedChunks.map(c => `[Source: ${c.title}]\n${c.content}`).join('\n\n')
        : 'No specific knowledge articles found in database for this query.';

      const systemPrompt = `You are SkinAI's certified skincare advisor. Follow these strict rules:
1. Ground your answer in the provided retrieved skincare knowledge.
2. Trust first, commerce second. Never push products unnecessarily.
3. Safety boundary: Do NOT diagnose medical skin conditions (e.g. suspicious lesions, cystic infections). For severe or persistent issues, explicitly advise consulting a board-certified dermatologist.
4. Do NOT invent fake ingredients or conflicting interaction rules.

Retrieved Skincare Knowledge:
${contextText}`;

      const response = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 400,
        temperature: 0.3,
      });

      const answer = response.choices[0]?.message.content || 'Unable to generate response.';

      // Persist Assistant Message
      await db.insert(aiMessages).values({
        conversationId: convId,
        role: MessageRole.ASSISTANT,
        content: answer,
        metadata: {
          retrievedChunks: retrievedChunks.length,
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          tokensUsed: response.usage?.total_tokens,
        },
      });

      return {
        conversationId: convId,
        status: 'SUCCESS',
        answer,
        sources: retrievedChunks,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'OpenAI Chat Completion Error');

      const isQuotaError = err.status === 429 || (err.message && err.message.includes('429'));
      const errorMsg = isQuotaError
        ? 'OpenAI provider quota limit reached (429 Insufficient Credits). The live AI demo is paused until active billing credits are added to the configured OpenAI account.'
        : `AI provider error: ${err.message || 'Service unavailable'}`;

      await db.insert(aiMessages).values({
        conversationId: convId,
        role: MessageRole.ASSISTANT,
        content: errorMsg,
        metadata: { retrievedChunks: retrievedChunks.length, safetyTriggered: false },
      });

      return {
        conversationId: convId,
        status: isQuotaError ? 'QUOTA_EXHAUSTED' : 'ERROR',
        answer: errorMsg,
        sources: retrievedChunks,
        requiresConfiguration: isQuotaError,
      };
    }
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
        explanation += `- ${c.rule?.explanation || c.message || 'Ingredient conflict'} Recommendation: ${c.rule?.recommendation || 'Separate usage.'}\n`;
      }
      explanation += '\n';
    } else {
      explanation += '✅ No direct ingredient conflicts were detected.\n\n';
    }

    if (synergies.length > 0) {
      explanation += `✨ Beneficial Synergies (${synergies.length}):\n`;
      for (const s of synergies) {
        explanation += `- ${s.rule?.explanation || s.message || 'Complimentary active pairing.'}\n`;
      }
      explanation += '\n';
    }

    if (cautions.length > 0) {
      explanation += `💡 Application Cautions (${cautions.length}):\n`;
      for (const c of cautions) {
        explanation += `- ${c.rule?.explanation || c.issue || c.message || 'Watch for potential irritation.'}\n`;
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
   * Get user's AI conversations
   */
  static async getUserConversations(userId: string) {
    return db.select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.updatedAt));
  }

  /**
   * Get messages for a specific conversation with IDOR ownership check
   */
  static async getConversationMessages(userId: string, conversationId: string) {
    const [conv] = await db.select().from(aiConversations)
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

    const messages = await db.select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversationId))
      .orderBy(aiMessages.createdAt);

    return {
      conversation: conv,
      messages,
    };
  }
}
