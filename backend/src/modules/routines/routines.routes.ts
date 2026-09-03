import { Router } from 'express';
import * as routinesController from './routines.controller.js';
import { authenticate as requireAuth } from '../../middleware/authenticate.js';

const router = Router();

// All routine routes require authentication
router.use(requireAuth);

router.post('/', routinesController.createRoutine);
router.get('/', routinesController.getUserRoutines);
router.get('/:id', routinesController.getRoutineById);
router.patch('/:id', routinesController.updateRoutine);
router.delete('/:id', routinesController.deleteRoutine);

// Analysis routes
router.get('/:id/analysis', routinesController.getLatestAnalysis);
router.post('/:id/analyze', routinesController.analyzeRoutine);

export { router as routineRoutes };
