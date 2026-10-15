import { Router } from 'express';
import { authenticate as requireAuth } from '../../middleware/authenticate.js';
import * as controller from './ai.controller.js';

const router = Router();

// Public knowledge retrieval endpoint
router.get('/knowledge', controller.retrieveKnowledge);

// Protected AI endpoints
router.use(requireAuth);
router.post('/ask', controller.askQuestion);
router.post('/explain-routine/:routineId', controller.explainRoutine);
router.get('/conversations', controller.getConversations);
router.get('/conversations/:id', controller.getConversationMessages);

export { router as aiRoutes };
