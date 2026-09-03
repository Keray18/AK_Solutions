import { Request, Response, NextFunction } from 'express';
import { RoutinesService } from './routines.service.js';
import { createRoutineSchema, updateRoutineSchema } from './routines.schemas.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { RoutineAnalysisService } from './analysis.service.js';

export const createRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRoutineSchema.parse(req.body);
    const routine = await RoutinesService.createRoutine(req.user!.id, data);
    sendSuccess(res, routine, 201);
  } catch (error) {
    next(error);
  }
};

export const getUserRoutines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routines = await RoutinesService.getUserRoutines(req.user!.id);
    sendSuccess(res, routines);
  } catch (error) {
    next(error);
  }
};

export const getRoutineById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const routine = await RoutinesService.getRoutineById(req.user!.id, req.params.id as string);
    sendSuccess(res, routine);
  } catch (error) {
    next(error);
  }
};

export const updateRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateRoutineSchema.parse(req.body);
    const routine = await RoutinesService.updateRoutine(req.user!.id, req.params.id as string, data);
    sendSuccess(res, routine);
  } catch (error) {
    next(error);
  }
};

export const deleteRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await RoutinesService.deleteRoutine(req.user!.id, req.params.id as string);
    sendSuccess(res, { success: true });
  } catch (error) {
    next(error);
  }
};

export const analyzeRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await RoutineAnalysisService.analyzeRoutine(req.user!.id, req.params.id as string);
    sendSuccess(res, analysis);
  } catch (error) {
    next(error);
  }
};

export const getLatestAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await RoutineAnalysisService.getLatestAnalysis(req.user!.id, req.params.id as string);
    if (!analysis) {
      return sendSuccess(res, { analysisUnavailable: true });
    }
    sendSuccess(res, analysis);
  } catch (error) {
    next(error);
  }
};
