import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { RecommendationService } from '../recommendations/recommendation.service.js';
import { RecommendationType } from '../../shared/types/enums.js';

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

export const getReplacements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Construct basic context from user using ContextLoader
    const { ContextLoader } = await import('../routines/engines/contextLoader.js');
    const fullContext = await ContextLoader.load(req.user!.id);
    
    const concerns = fullContext.skinProfile?.concerns || [];
    const primaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'primary')
      .map(c => c.type.toString());
    const secondaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'secondary')
      .map(c => c.type.toString());

    const context = {
      userId: req.user!.id,
      primaryConcerns,
      secondaryConcerns,
      skinType: fullContext.skinProfile?.skinType || undefined,
      sensitivity: fullContext.skinProfile?.sensitivity || undefined,
      existingProductIds: [],
      ownedProductIds: [],
      requestType: RecommendationType.PRODUCT_REPLACEMENT
    };
    
    const decision = await RecommendationService.processReplacement(context, req.params.id as string);
    sendSuccess(res, decision);
  } catch (err) {
    next(err);
  }
};

export const compareProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productIds } = req.body;
    
    // Construct basic context from user using ContextLoader
    const { ContextLoader } = await import('../routines/engines/contextLoader.js');
    const fullContext = await ContextLoader.load(req.user!.id);
    
    const concerns = fullContext.skinProfile?.concerns || [];
    const primaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'primary')
      .map(c => c.type.toString());
    const secondaryConcerns = concerns
      .filter(c => (c.priority || '').toString().toLowerCase() === 'secondary')
      .map(c => c.type.toString());

    const context = {
      userId: req.user!.id,
      primaryConcerns,
      secondaryConcerns,
      skinType: fullContext.skinProfile?.skinType || undefined,
      sensitivity: fullContext.skinProfile?.sensitivity || undefined,
      existingProductIds: [],
      ownedProductIds: [],
      requestType: RecommendationType.PRODUCT_SUGGESTION
    };

    const decision = await RecommendationService.compareProducts(context, productIds);
    sendSuccess(res, decision);
  } catch (err) {
    next(err);
  }
};

