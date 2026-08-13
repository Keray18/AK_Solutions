import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { UserRole } from '../../shared/types/enums.js';
import * as controller from './brands.controller.js';
import * as schemas from './brands.schemas.js';

const router = Router();

// Public routes
// router.get('/', validate(schemas.brandQuerySchema, 'query'), controller.getBrands);
// router.get('/:id', controller.getBrandById);

// Admin routes (Currently putting everything under admin as requested by prompt "Admin Brand CRUD")
router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/', validate(schemas.brandQuerySchema, 'query'), controller.getBrands);
router.post('/', validate(schemas.createBrandSchema), controller.createBrand);
router.get('/:id', controller.getBrandById);
router.patch('/:id', validate(schemas.updateBrandSchema), controller.updateBrand);
router.delete('/:id', controller.deleteBrand);

export default router;
