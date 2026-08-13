import { Router } from 'express';
import { usersController } from './users.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

// Protect all user routes
router.use(authenticate);

router.get('/me', usersController.getMe);
router.patch('/me', validate(updateProfileSchema), usersController.updateMe);

export const userRoutes = router;
