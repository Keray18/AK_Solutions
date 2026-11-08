import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service.js';
import { PersonalContextService } from './personalContext.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';

export const askQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { question, conversationId } = req.body;
    
    if (!question || typeof question !== 'string') {
      res.status(400).json({ status: 'error', message: 'Valid question text is required' });
      return;
    }

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      res.status(400).json({ status: 'error', message: 'Question cannot be empty' });
      return;
    }

    if (trimmedQuestion.length > 1000) {
      res.status(400).json({ status: 'error', message: 'Question exceeds maximum limit of 1,000 characters' });
      return;
    }

    const result = await AIService.askQuestion(userId, trimmedQuestion, conversationId);
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

export const deleteConversation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id as string;
    const result = await AIService.deleteConversation(userId, conversationId);
    sendSuccess(res, result);
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

export const getPersonalContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const context = await PersonalContextService.getPersonalContext(userId);
    sendSuccess(res, context);
  } catch (err) {
    next(err);
  }
};

export const getHealthContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const health = await AIService.getHealthContext(userId);
    sendSuccess(res, health);
  } catch (err) {
    next(err);
  }
};

export const updateHealthContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const updated = await AIService.updateHealthContext(userId, req.body);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

export const clearHealthContext = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await AIService.clearHealthContext(userId);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getUserMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const memory = await AIService.getUserMemory(userId);
    sendSuccess(res, memory);
  } catch (err) {
    next(err);
  }
};

export const updateUserMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const memory = await AIService.updateUserMemory(userId, req.body);
    sendSuccess(res, memory);
  } catch (err) {
    next(err);
  }
};

export const clearUserMemory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await AIService.clearUserMemory(userId);
    sendSuccess(res, result);
  } catch (err) {
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

