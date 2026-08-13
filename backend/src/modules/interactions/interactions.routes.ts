import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { UserRole } from '../../shared/types/enums.js';
import * as controller from './interactions.controller.js';
import * as schemas from './interactions.schemas.js';

const router = Router();

// Interactions are mostly system logic, but maybe public wants to query a specific interaction
router.get('/', validate(schemas.interactionQuerySchema, 'query'), controller.getInteractions);
router.get('/:id', controller.getInteractionById);

// Admin routes (require ADMIN role for mutation)
router.post('/', authenticate, authorize(UserRole.ADMIN), validate(schemas.createInteractionSchema), controller.createInteraction);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN), validate(schemas.updateInteractionSchema), controller.updateInteraction);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.deleteInteraction);

export default router;
