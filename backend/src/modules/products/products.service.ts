import { productsRepository, type NewProduct, type ProductIngredientInput } from './products.repository.js';
import { brandsRepository } from '../brands/brands.repository.js';
import { ingredientsRepository } from '../ingredients/ingredients.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/types/errors.js';

export class ProductsService {
  async createProduct(data: Omit<NewProduct, 'price'> & { price?: number | null }, ingredients?: ProductIngredientInput[]) {
    // Validate brand
    const brand = await brandsRepository.findById(data.brandId);
    if (!brand) throw new NotFoundError('Brand not found');

    const existingSlug = await productsRepository.findBySlug(data.slug);
    if (existingSlug) throw new ConflictError('Product with this slug already exists');

    // Validate ingredients
    if (ingredients && ingredients.length > 0) {
      await this.validateIngredients(ingredients);
    }

    return productsRepository.create(data, ingredients);
  }

  async updateProduct(id: string, data: Partial<Omit<NewProduct, 'price'> & { price?: number | null }>, ingredients?: ProductIngredientInput[]) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');

    if (data.brandId && data.brandId !== existing.brandId) {
      const brand = await brandsRepository.findById(data.brandId);
      if (!brand) throw new NotFoundError('Brand not found');
    }

    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await productsRepository.findBySlug(data.slug);
      if (existingSlug) throw new ConflictError('Slug already in use');
    }

    if (ingredients) {
      await this.validateIngredients(ingredients);
    }

    return productsRepository.update(id, data, ingredients);
  }

  private async validateIngredients(ingredients: ProductIngredientInput[]) {
    // Check for negative positions or duplicate positions
    const positions = new Set();
    const ids = new Set();
    for (const ing of ingredients) {
      if (ing.position < 1) throw new ValidationError({ position: ['Position must be >= 1'] });
      if (positions.has(ing.position)) throw new ValidationError({ position: ['Duplicate positions are not allowed'] });
      if (ids.has(ing.ingredientId)) throw new ValidationError({ ingredientId: ['Duplicate ingredients are not allowed'] });
      positions.add(ing.position);
      ids.add(ing.ingredientId);
      
      const dbIng = await ingredientsRepository.findById(ing.ingredientId);
      if (!dbIng) throw new NotFoundError(`Ingredient ${ing.ingredientId} not found`);
    }
  }

  async getProductById(id: string) {
    const product = await productsRepository.findByIdWithDetails(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async listProducts(params: { page: number; limit: number; search?: string; brandId?: string; category?: string; country?: string; available?: boolean }) {
    return productsRepository.findAll(params);
  }

  async deleteProduct(id: string) {
    const existing = await productsRepository.findById(id);
    if (!existing) throw new NotFoundError('Product not found');
    await productsRepository.softDelete(id);
  }
}

export const productsService = new ProductsService();
