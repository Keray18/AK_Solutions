import { ingredientsRepository, type NewIngredient } from './ingredients.repository.js';
import { ConflictError, NotFoundError } from '../../shared/types/errors.js';

export class IngredientsService {
  async createIngredient(data: NewIngredient) {
    const existing = await ingredientsRepository.findByInciName(data.inciName);
    if (existing) {
      throw new ConflictError('Ingredient with this INCI name already exists');
    }

    return ingredientsRepository.create(data);
  }

  async updateIngredient(id: string, data: Partial<NewIngredient>) {
    const existing = await ingredientsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Ingredient not found');
    }

    if (data.inciName && data.inciName.toLowerCase() !== existing.inciName.toLowerCase()) {
      const existingInci = await ingredientsRepository.findByInciName(data.inciName);
      if (existingInci) throw new ConflictError('INCI name already in use');
    }

    return ingredientsRepository.update(id, data);
  }

  async getIngredientById(id: string) {
    const ingredient = await ingredientsRepository.findById(id);
    if (!ingredient) throw new NotFoundError('Ingredient not found');
    return ingredient;
  }

  async listIngredients(params: { page: number; limit: number; search?: string; category?: string; evidenceQuality?: string }) {
    return ingredientsRepository.findAll(params);
  }

  async deleteIngredient(id: string) {
    const existing = await ingredientsRepository.findById(id);
    if (!existing) throw new NotFoundError('Ingredient not found');
    // Note: We might want to check for associated products or interactions before deleting.
    // For now, we use DB cascade/restrict behaviors or standard delete.
    await ingredientsRepository.delete(id);
  }
}

export const ingredientsService = new IngredientsService();
