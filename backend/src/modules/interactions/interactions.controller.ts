import type { Request, Response, NextFunction } from 'express';
import { interactionsService } from './interactions.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const createInteraction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const interaction = await interactionsService.createInteraction(req.body);
    sendSuccess(res, interaction, 201);
  } catch (err) {
    next(err);
  }
};

export const getInteractions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.query as any;
    const result = await interactionsService.listInteractions(params);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getInteractionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const interaction = await interactionsService.getInteractionById(req.params.id as string);
    sendSuccess(res, interaction);
  } catch (err) {
    next(err);
  }
};

export const updateInteraction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const interaction = await interactionsService.updateInteraction(req.params.id as string, req.body);
    sendSuccess(res, interaction);
  } catch (err) {
    next(err);
  }
};

export const deleteInteraction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await interactionsService.deleteInteraction(req.params.id as string);
    sendSuccess(res, null, 204);
  } catch (err) {
    next(err);
  }
};
