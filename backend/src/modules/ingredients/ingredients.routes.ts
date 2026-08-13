import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { UserRole } from '../../shared/types/enums.js';
import * as controller from './ingredients.controller.js';
import * as schemas from './ingredients.schemas.js';

const router = Router();

// Public routes
router.get('/', validate(schemas.ingredientQuerySchema, 'query'), controller.getIngredients);
router.get('/:id', controller.getIngredientById);

// Admin routes (require ADMIN role for mutation)
router.post('/', authenticate, authorize(UserRole.ADMIN), validate(schemas.createIngredientSchema), controller.createIngredient);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN), validate(schemas.updateIngredientSchema), controller.updateIngredient);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.deleteIngredient);

export default router;
