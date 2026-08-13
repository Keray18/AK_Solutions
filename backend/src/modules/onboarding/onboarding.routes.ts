import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './onboarding.controller.js';
import * as schemas from './onboarding.schemas.js';

const router = Router();

// All onboarding routes require authentication
router.use(authenticate);

router.get('/status', controller.getStatus);

router.post('/profile', validate(schemas.onboardingProfileSchema), controller.saveProfile);
router.post('/skin', validate(schemas.onboardingSkinTypeSchema), controller.saveSkinType);
router.post('/concerns', validate(schemas.onboardingConcernsSchema), controller.saveConcerns);
router.post('/sensitivity', validate(schemas.onboardingSensitivitySchema), controller.saveSensitivity);
router.post('/lifestyle', validate(schemas.onboardingLifestyleSchema), controller.saveLifestyle);
router.post('/environment', validate(schemas.onboardingEnvironmentSchema), controller.saveEnvironment);
router.post('/budget', validate(schemas.onboardingBudgetSchema), controller.saveBudget);
router.post('/routine', validate(schemas.onboardingRoutineSchema), controller.saveRoutine);

router.post('/complete', controller.completeOnboarding);

export default router;
