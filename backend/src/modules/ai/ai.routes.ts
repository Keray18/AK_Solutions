import { Router } from 'express';
import { authenticate as requireAuth } from '../../middleware/authenticate.js';
import { aiLimiter } from '../../middleware/rateLimiter.js';
import * as controller from './ai.controller.js';

const router = Router();

// Public knowledge retrieval endpoint
router.get('/knowledge', controller.retrieveKnowledge);

// Protected AI endpoints
router.use(requireAuth);
router.post('/ask', aiLimiter, controller.askQuestion);
router.post('/explain-routine/:routineId', aiLimiter, controller.explainRoutine);

// Conversations & Memory
router.get('/conversations', controller.getConversations);
router.get('/conversations/:id', controller.getConversationMessages);
router.delete('/conversations/:id', controller.deleteConversation);

// Personal Context Transparency
router.get('/personal-context', controller.getPersonalContext);

// Consented Health Context
router.get('/health-context', controller.getHealthContext);
router.put('/health-context', controller.updateHealthContext);
router.delete('/health-context', controller.clearHealthContext);

// Conversational Long-Term Memory
router.get('/memory', controller.getUserMemory);
router.put('/memory', controller.updateUserMemory);
router.delete('/memory', controller.clearUserMemory);

export { router as aiRoutes };
