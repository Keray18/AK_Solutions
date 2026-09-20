import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { UserRole } from '../../shared/types/enums.js';
import * as controller from './products.controller.js';
import * as schemas from './products.schemas.js';

const router = Router();

// Public routes
router.get('/', validate(schemas.productQuerySchema, 'query'), controller.getProducts);
router.post('/compare', authenticate, controller.compareProducts);
router.get('/:id', controller.getProductById);
router.post('/:id/replacements', authenticate, controller.getReplacements);

// Admin routes (require ADMIN role for mutation)
router.post('/', authenticate, authorize(UserRole.ADMIN), validate(schemas.createProductSchema), controller.createProduct);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN), validate(schemas.updateProductSchema), controller.updateProduct);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), controller.deleteProduct);

export default router;
