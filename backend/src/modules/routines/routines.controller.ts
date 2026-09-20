import { Request, Response, NextFunction } from 'express';
import { RoutinesService } from './routines.service.js';
import { createRoutineSchema, updateRoutineSchema } from './routines.schemas.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { RoutineAnalysisService } from './analysis.service.js';
import { RoutineOptimizer } from './engines/optimizer.js';

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

import { ContextLoader } from './engines/contextLoader.js';
import { db } from '../../config/database.js';
import { routineSteps } from '../../db/schema/routines.js';
import { eq } from 'drizzle-orm';

export const optimizeRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = await ContextLoader.load(req.user!.id);
    const analysis = await RoutineAnalysisService.getLatestAnalysis(req.user!.id, req.params.id as string);
    if (!analysis) {
      res.status(400).json({ status: 'error', message: 'Routine must be analyzed before optimization' });
      return;
    }

    const optimization = RoutineOptimizer.optimize(context, analysis);
    sendSuccess(res, optimization);
  } catch (error) {
    next(error);
  }
};

export const applyOptimization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { changes } = req.body;
    const routineId = req.params.id as string;
    
    await db.transaction(async (tx) => {
      for (const change of changes) {
        if (change.action === 'REMOVE' && change.stepId) {
           await tx.delete(routineSteps).where(eq(routineSteps.id, change.stepId));
        } else if (change.action === 'ADD' && change.productId) {
           await tx.insert(routineSteps).values({
             routineId,
             productId: change.productId,
             dayTime: 'morning', // Needs proper client logic or inference in future
             order: 99
           });
        } else if (change.action === 'REPLACE' && change.stepId && change.productId) {
           await tx.update(routineSteps)
             .set({ productId: change.productId })
             .where(eq(routineSteps.id, change.stepId));
        }
      }
    });

    // Generate fresh analysis
    const newAnalysis = await RoutineAnalysisService.analyzeRoutine(req.user!.id, routineId);
    
    sendSuccess(res, { success: true, appliedChanges: changes, newAnalysis });
  } catch (error) {
    next(error);
  }
};
