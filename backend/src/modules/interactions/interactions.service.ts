import { interactionsRepository, type NewInteraction } from './interactions.repository.js';
import { ingredientsRepository } from '../ingredients/ingredients.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/types/errors.js';

export class InteractionsService {
  private orderPair(id1: string, id2: string): [string, string] {
    return id1 < id2 ? [id1, id2] : [id2, id1];
  }

  async createInteraction(data: NewInteraction) {
    if (data.ingredientAId === data.ingredientBId) {
      throw new ValidationError({ ingredientBId: ['Ingredients must be different'] });
    }

    const [aId, bId] = this.orderPair(data.ingredientAId, data.ingredientBId);
    
    // Ensure both exist
    const [ingA, ingB] = await Promise.all([
      ingredientsRepository.findById(aId),
      ingredientsRepository.findById(bId)
    ]);

    if (!ingA || !ingB) {
      throw new NotFoundError('One or both ingredients not found');
    }

    const existing = await interactionsRepository.findByPair(aId, bId);
    if (existing) {
      throw new ConflictError('Interaction rule between these ingredients already exists');
    }

    return interactionsRepository.create({ ...data, ingredientAId: aId, ingredientBId: bId });
  }

  async updateInteraction(id: string, data: Partial<NewInteraction>) {
    const existing = await interactionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Interaction not found');

    const newAId = data.ingredientAId || existing.ingredientAId;
    const newBId = data.ingredientBId || existing.ingredientBId;

    if (newAId === newBId) {
      throw new ValidationError({ ingredientBId: ['Ingredients must be different'] });
    }

    const [aId, bId] = this.orderPair(newAId, newBId);

    if (aId !== existing.ingredientAId || bId !== existing.ingredientBId) {
      const existingPair = await interactionsRepository.findByPair(aId, bId);
      if (existingPair && existingPair.id !== id) {
        throw new ConflictError('Interaction rule between these ingredients already exists');
      }
    }

    if (data.ingredientAId || data.ingredientBId) {
       data.ingredientAId = aId;
       data.ingredientBId = bId;
    }

    return interactionsRepository.update(id, data);
  }

  async getInteractionById(id: string) {
    const interaction = await interactionsRepository.findById(id);
    if (!interaction) throw new NotFoundError('Interaction not found');
    return interaction;
  }

  async listInteractions(params: { page: number; limit: number; ingredientId?: string; interactionType?: string }) {
    return interactionsRepository.findAll(params);
  }

  async deleteInteraction(id: string) {
    const existing = await interactionsRepository.findById(id);
    if (!existing) throw new NotFoundError('Interaction not found');
    await interactionsRepository.delete(id);
  }
}

export const interactionsService = new InteractionsService();
