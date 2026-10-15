import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const askQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { question, conversationId } = req.body;
    
    if (!question || typeof question !== 'string') {
      res.status(400).json({ status: 'error', message: 'Valid question text is required' });
      return;
    }

    const result = await AIService.askQuestion(userId, question, conversationId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const explainRoutine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const routineId = req.params.routineId as string;

    const explanation = await AIService.explainRoutineAnalysis(userId, routineId);
    sendSuccess(res, explanation);
  } catch (err: any) {
    if (err.statusCode === 403) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }
    if (err.message && err.message.includes('not found')) {
      res.status(404).json({ status: 'error', message: err.message });
      return;
    }
    next(err);
  }
};

export const getConversations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversations = await AIService.getUserConversations(userId);
    sendSuccess(res, conversations);
  } catch (err) {
    next(err);
  }
};

export const getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;
    const data = await AIService.getConversationMessages(userId, conversationId);
    sendSuccess(res, data);
  } catch (err: any) {
    if (err.statusCode === 403) {
      res.status(403).json({ status: 'error', message: 'Forbidden' });
      return;
    }
    if (err.message && err.message.includes('not found')) {
      res.status(404).json({ status: 'error', message: err.message });
      return;
    }
    next(err);
  }
};

export const retrieveKnowledge = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) {
      res.status(400).json({ status: 'error', message: 'Query parameter q is required' });
      return;
    }
    const chunks = await AIService.retrieveRelevantKnowledge(query);
    sendSuccess(res, chunks);
  } catch (err) {
    next(err);
  }
};
