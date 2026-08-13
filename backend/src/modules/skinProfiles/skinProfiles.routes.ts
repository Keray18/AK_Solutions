import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './skinProfiles.controller.js';
import * as schemas from './skinProfiles.schemas.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getSkinProfile);
router.patch('/', validate(schemas.patchSkinProfileSchema), controller.updateSkinProfile);

export default router;
