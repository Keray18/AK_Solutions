import { db } from '../../config/database.js';
import { brands } from '../../db/schema/products.js';
import { eq, ilike, and, sql, desc, or } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

export type Brand = InferSelectModel<typeof brands>;
export type NewBrand = InferInsertModel<typeof brands>;

export class BrandsRepository {
  async create(data: NewBrand): Promise<Brand> {
    const [brand] = await db.insert(brands).values(data).returning();
    if (!brand) throw new Error('Not created');
    return brand;
  }

  async findById(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand;
  }

  async findBySlug(slug: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.slug, slug));
    return brand;
  }

  async findByName(name: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.name, name));
    return brand;
  }

  async update(id: string, data: Partial<NewBrand>): Promise<Brand> {
    const [brand] = await db
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();
    if (!brand) throw new Error('Not found');
    return brand;
  }

  async delete(id: string): Promise<void> {
    await db.delete(brands).where(eq(brands.id, id));
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    active?: boolean;
  }): Promise<{ data: Brand[]; total: number }> {
    const { page, limit, search, active } = params;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (search) {
      conditions.push(or(ilike(brands.name, `%${search}%`), ilike(brands.slug, `%${search}%`)));
    }
    
    if (active !== undefined) {
      conditions.push(eq(brands.active, active));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select().from(brands).where(where);
    const countQuery = db.select({ count: sql<number>`count(*)` }).from(brands).where(where);

    const [data, countResult] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(desc(brands.createdAt)),
      countQuery,
    ]);

    return { data, total: Number(countResult[0]?.count || 0) };
  }
}

export const brandsRepository = new BrandsRepository();
