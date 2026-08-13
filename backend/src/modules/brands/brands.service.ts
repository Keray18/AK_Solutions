import { brandsRepository, type NewBrand } from './brands.repository.js';
import { ConflictError, NotFoundError } from '../../shared/types/errors.js';

export class BrandsService {
  async createBrand(data: NewBrand) {
    const existingSlug = await brandsRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw new ConflictError('Brand with this slug already exists');
    }

    const existingName = await brandsRepository.findByName(data.name);
    if (existingName) {
      throw new ConflictError('Brand with this name already exists');
    }

    return brandsRepository.create(data);
  }

  async updateBrand(id: string, data: Partial<NewBrand>) {
    const existing = await brandsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Brand not found');
    }

    if (data.slug && data.slug !== existing.slug) {
      const existingSlug = await brandsRepository.findBySlug(data.slug);
      if (existingSlug) throw new ConflictError('Slug already in use');
    }

    if (data.name && data.name !== existing.name) {
      const existingName = await brandsRepository.findByName(data.name);
      if (existingName) throw new ConflictError('Name already in use');
    }

    return brandsRepository.update(id, data);
  }

  async getBrandById(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError('Brand not found');
    return brand;
  }

  async listBrands(params: { page: number; limit: number; search?: string; active?: boolean }) {
    return brandsRepository.findAll(params);
  }

  async deleteBrand(id: string) {
    const existing = await brandsRepository.findById(id);
    if (!existing) throw new NotFoundError('Brand not found');
    // Note: We might want to check for associated products before deleting, 
    // or rely on DB FK constraints. The prompt says "Delete behavior should normally be soft/inactive if referenced products exist. Do NOT blindly cascade-delete products."
    // Let's implement soft-delete if it's referenced, or we can just set active = false
    await brandsRepository.update(id, { active: false });
  }
}

export const brandsService = new BrandsService();
