import type { Request, Response, NextFunction } from 'express';
import { ingredientsService } from './ingredients.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const createIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await ingredientsService.createIngredient(req.body);
    sendSuccess(res, ingredient, 201);
  } catch (err) {
    next(err);
  }
};

export const getIngredients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.query as any;
    const result = await ingredientsService.listIngredients(params);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getIngredientById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await ingredientsService.getIngredientById(req.params.id as string);
    sendSuccess(res, ingredient);
  } catch (err) {
    next(err);
  }
};

export const updateIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ingredient = await ingredientsService.updateIngredient(req.params.id as string, req.body);
    sendSuccess(res, ingredient);
  } catch (err) {
    next(err);
  }
};

export const deleteIngredient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ingredientsService.deleteIngredient(req.params.id as string);
    sendSuccess(res, null, 204);
  } catch (err) {
    next(err);
  }
};
