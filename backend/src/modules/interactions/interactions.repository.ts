import { db } from '../../config/database.js';
import { ingredientInteractions } from '../../db/schema/ingredients.js';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Interaction = InferSelectModel<typeof ingredientInteractions>;
export type NewInteraction = InferInsertModel<typeof ingredientInteractions>;

export class InteractionsRepository {
  async create(data: NewInteraction): Promise<Interaction> {
    const [interaction] = await db.insert(ingredientInteractions).values(data).returning();
    if (!interaction) throw new Error('Not created');
    return interaction;
  }

  async findById(id: string): Promise<Interaction | undefined> {
    const [interaction] = await db.select().from(ingredientInteractions).where(eq(ingredientInteractions.id, id));
    return interaction;
  }

  async findByPair(ingredientAId: string, ingredientBId: string) {
    const [interaction] = await db
      .select()
      .from(ingredientInteractions)
      .where(
        or(
          and(eq(ingredientInteractions.ingredientAId, ingredientAId), eq(ingredientInteractions.ingredientBId, ingredientBId)),
          and(eq(ingredientInteractions.ingredientAId, ingredientBId), eq(ingredientInteractions.ingredientBId, ingredientAId))
        )
      );
    return interaction;
  }

  async update(id: string, data: Partial<NewInteraction>): Promise<Interaction> {
    const [interaction] = await db
      .update(ingredientInteractions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ingredientInteractions.id, id))
      .returning();
    if (!interaction) throw new Error('Not found');
    return interaction;
  }

  async delete(id: string): Promise<void> {
    await db.delete(ingredientInteractions).where(eq(ingredientInteractions.id, id));
  }

  async findAll(params: {
    page: number;
    limit: number;
    ingredientId?: string;
    interactionType?: string;
  }) {
    const { page, limit, ingredientId, interactionType } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (ingredientId) {
      conditions.push(or(
        eq(ingredientInteractions.ingredientAId, ingredientId),
        eq(ingredientInteractions.ingredientBId, ingredientId)
      ));
    }
    
    if (interactionType) {
      conditions.push(eq(ingredientInteractions.interactionType, interactionType as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select({
        id: ingredientInteractions.id,
        interactionType: ingredientInteractions.interactionType,
        severity: ingredientInteractions.severity,
        ingredientAId: ingredientInteractions.ingredientAId,
        ingredientBId: ingredientInteractions.ingredientBId,
        sameRoutineOk: ingredientInteractions.sameRoutineOk,
        sameDayOk: ingredientInteractions.sameDayOk,
      })
      .from(ingredientInteractions)
      .where(where);

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(ingredientInteractions).where(where);

    const [data, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(desc(ingredientInteractions.createdAt)),
      countQuery,
    ]);

    return { data, total: Number(countResult[0]?.count || 0) };
  }
}

export const interactionsRepository = new InteractionsRepository();
