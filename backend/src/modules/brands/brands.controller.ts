import type { Request, Response, NextFunction } from 'express';
import { brandsService } from './brands.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const createBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandsService.createBrand(req.body);
    sendSuccess(res, brand, 201);
  } catch (err) {
    next(err);
  }
};

export const getBrands = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.query as any;
    const result = await brandsService.listBrands(params);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getBrandById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandsService.getBrandById(req.params.id as string);
    sendSuccess(res, brand);
  } catch (err) {
    next(err);
  }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const brand = await brandsService.updateBrand(req.params.id as string, req.body);
    sendSuccess(res, brand);
  } catch (err) {
    next(err);
  }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await brandsService.deleteBrand(req.params.id as string);
    sendSuccess(res, null, 204);
  } catch (err) {
    next(err);
  }
};
