import { Request, Response } from 'express';
import { onboardingService } from './onboarding.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const status = await onboardingService.getStatus(userId);
  sendSuccess(res, status);
});

export const saveProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveProfile(userId, req.body);
  sendSuccess(res, { message: 'Profile saved' });
});

export const saveSkinType = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await onboardingService.saveSkinType(userId, req.body);
  sendSuccess(res, result);
});

export const saveConcerns = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveConcerns(userId, req.body);
  sendSuccess(res, { message: 'Concerns saved' });
});

export const saveSensitivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveSensitivity(userId, req.body);
  sendSuccess(res, { message: 'Sensitivity saved' });
});

export const saveLifestyle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveLifestyle(userId, req.body);
  sendSuccess(res, { message: 'Lifestyle saved' });
});

export const saveEnvironment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveEnvironment(userId, req.body);
  sendSuccess(res, { message: 'Environment saved' });
});

export const saveBudget = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveBudget(userId, req.body);
  sendSuccess(res, { message: 'Budget saved' });
});

export const saveRoutine = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  await onboardingService.saveRoutine(userId, req.body);
  sendSuccess(res, { message: 'Routine saved' });
});

export const completeOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await onboardingService.complete(userId);
  sendSuccess(res, result);
});
