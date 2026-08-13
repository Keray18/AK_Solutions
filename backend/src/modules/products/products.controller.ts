import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ingredients, ...productData } = req.body;
    const product = await productsService.createProduct(productData, ingredients);
    sendSuccess(res, product, 201);
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.query as any;
    const result = await productsService.listProducts(params);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productsService.getProductById(req.params.id as string);
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ingredients, ...productData } = req.body;
    const product = await productsService.updateProduct(req.params.id as string, productData, ingredients);
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productsService.deleteProduct(req.params.id as string);
    sendSuccess(res, null, 204);
  } catch (err) {
    next(err);
  }
};
