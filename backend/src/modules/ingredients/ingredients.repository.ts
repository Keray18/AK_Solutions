import { db } from '../../config/database.js';
import { ingredients } from '../../db/schema/ingredients.js';
import { eq, ilike, and, sql, desc, or } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Ingredient = InferSelectModel<typeof ingredients>;
export type NewIngredient = InferInsertModel<typeof ingredients>;

export class IngredientsRepository {
  async create(data: NewIngredient): Promise<Ingredient> {
    const [ingredient] = await db.insert(ingredients).values(data).returning();
    if (!ingredient) throw new Error('Not created');
    return ingredient;
  }

  async findById(id: string): Promise<Ingredient | undefined> {
    const [ingredient] = await db.select().from(ingredients).where(eq(ingredients.id, id));
    return ingredient;
  }

  async findByInciName(inciName: string): Promise<Ingredient | undefined> {
    const [ingredient] = await db.select().from(ingredients).where(sql`LOWER(${ingredients.inciName}) = LOWER(${inciName})`);
    return ingredient;
  }

  async update(id: string, data: Partial<NewIngredient>): Promise<Ingredient> {
    const [ingredient] = await db
      .update(ingredients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ingredients.id, id))
      .returning();
    if (!ingredient) throw new Error('Not found');
    return ingredient;
  }

  async delete(id: string): Promise<void> {
    await db.delete(ingredients).where(eq(ingredients.id, id));
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    evidenceQuality?: string;
  }): Promise<{ data: Ingredient[]; total: number }> {
    const { page, limit, search, category, evidenceQuality } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(or(
        ilike(ingredients.inciName, `%${search}%`),
        ilike(ingredients.commonName, `%${search}%`)
      ));
    }
    
    if (category) {
      conditions.push(eq(ingredients.category, category as any));
    }
    
    if (evidenceQuality) {
      conditions.push(eq(ingredients.evidenceQuality, evidenceQuality as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select().from(ingredients).where(where);
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(ingredients).where(where);

    const [data, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(desc(ingredients.createdAt)),
      countQuery,
    ]);

    return { data, total: Number(countResult[0]?.count || 0) };
  }
}

export const ingredientsRepository = new IngredientsRepository();
