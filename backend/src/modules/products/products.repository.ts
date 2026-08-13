import { db } from '../../config/database.js';
import { products, brands } from '../../db/schema/products.js';
import { productIngredients } from '../../db/schema/ingredients.js';
import { ingredients } from '../../db/schema/ingredients.js';
import { eq, ilike, and, sql, desc, or, isNull } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductIngredientInput = {
  ingredientId: string;
  position: number;
  isKeyIngredient: boolean;
};

export class ProductsRepository {
  async create(data: Omit<NewProduct, 'price'> & { price?: number | null }, ingredientList?: ProductIngredientInput[]): Promise<Product> {
    return await db.transaction(async (tx) => {
      // Create product
      const productData = {
        ...data,
        price: data.price !== undefined && data.price !== null ? String(data.price) : null
      };

      const [product] = await tx.insert(products).values(productData).returning();
      if (!product) throw new Error('Not created');

      // Insert ingredients if provided
      if (ingredientList && ingredientList.length > 0) {
        // Ensure no duplicates and position > 0 (handled by schema but good practice)
        const uniqueIngredients = Array.from(new Map(ingredientList.map(item => [item.ingredientId, item])).values());
        
        await tx.insert(productIngredients).values(
          uniqueIngredients.map((item) => ({
            productId: product.id,
            ingredientId: item.ingredientId,
            position: item.position,
            isKeyIngredient: item.isKeyIngredient,
          }))
        );
      }

      return product;
    });
  }

  async findById(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)));
    return product;
  }
  
  async findByIdWithDetails(id: string) {
    const product = await this.findById(id);
    if (!product) return undefined;

    const brand = await db.select().from(brands).where(eq(brands.id, product.brandId));
    
    const productIngredientsList = await db
      .select({
        position: productIngredients.position,
        isKeyIngredient: productIngredients.isKeyIngredient,
        ingredient: ingredients
      })
      .from(productIngredients)
      .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id))
      .where(eq(productIngredients.productId, id))
      .orderBy(productIngredients.position);

    return {
      ...product,
      brand: brand[0],
      ingredients: productIngredientsList
    };
  }

  async findBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNull(products.deletedAt)));
    return product;
  }

  async update(id: string, data: Partial<Omit<NewProduct, 'price'> & { price?: number | null }>, ingredientList?: ProductIngredientInput[]): Promise<Product> {
    return await db.transaction(async (tx) => {
      // Update product fields if there are any
      let updatedProduct;
      const updatePayload: any = { ...data };
      if ('price' in data) {
        updatePayload.price = data.price !== undefined && data.price !== null ? String(data.price) : null;
      }
      
      if (Object.keys(updatePayload).length > 0) {
        const [prod] = await tx
          .update(products)
          .set({ ...updatePayload, updatedAt: new Date() })
          .where(eq(products.id, id))
          .returning();
        updatedProduct = prod;
      }

      // Update ingredient mappings if provided
      if (ingredientList) {
        await tx.delete(productIngredients).where(eq(productIngredients.productId, id));
        if (ingredientList.length > 0) {
          const uniqueIngredients = Array.from(new Map(ingredientList.map(item => [item.ingredientId, item])).values());
          await tx.insert(productIngredients).values(
            uniqueIngredients.map((item) => ({
              productId: id,
              ingredientId: item.ingredientId,
              position: item.position,
              isKeyIngredient: item.isKeyIngredient,
            }))
          );
        }
      }

      const finalProduct = updatedProduct || (await tx.select().from(products).where(eq(products.id, id)))[0];
      if (!finalProduct) throw new Error('Product not found');
      return finalProduct;
    });
  }

  async softDelete(id: string): Promise<void> {
    await db.update(products).set({ deletedAt: new Date() }).where(eq(products.id, id));
  }

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    brandId?: string;
    category?: string;
    country?: string;
    available?: boolean;
  }) {
    const { page, limit, search, brandId, category, country, available } = params;
    const offset = (page - 1) * limit;

    const conditions = [isNull(products.deletedAt)];

    if (brandId) conditions.push(eq(products.brandId, brandId));
    if (category) conditions.push(eq(products.category, category as any));
    if (country) conditions.push(ilike(products.country, `%${country}%`));
    if (available !== undefined) conditions.push(eq(products.available, available));

    if (search) {
      conditions.push(or(
        ilike(products.name, `%${search}%`),
        ilike(products.slug, `%${search}%`),
        ilike(brands.name, `%${search}%`)
      ) as SQL<unknown>);
    }

    const where = conditions.length > 0 ? (and(...conditions) as SQL<unknown>) : undefined;
    
    const baseQuery = db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        category: products.category,
        country: products.country,
        size: products.size,
        price: products.price,
        currency: products.currency,
        hasFragrance: products.hasFragrance,
        available: products.available,
        imageUrl: products.imageUrl,
        brand: {
          id: brands.id,
          name: brands.name,
          slug: brands.slug
        }
      })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id));
    
    const dataQuery = where ? baseQuery.where(where).limit(limit).offset(offset).orderBy(desc(products.createdAt)) : baseQuery.limit(limit).offset(offset).orderBy(desc(products.createdAt));
    
    let countQueryBase = db.select({ count: sql<number>`count(*)` })
      .from(products)
      .innerJoin(brands, eq(products.brandId, brands.id));
      
    const countQuery = where ? countQueryBase.where(where) : countQueryBase;

    const [data, countResult] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    return { data, total: Number(countResult[0]?.count || 0) };
  }
}

export const productsRepository = new ProductsRepository();
