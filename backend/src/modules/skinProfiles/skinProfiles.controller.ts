import { Request, Response } from 'express';
import { skinProfilesService } from './skinProfiles.service.js';
import { sendSuccess } from '../../shared/utils/apiResponse.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';

export const getSkinProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const profile = await skinProfilesService.getSkinProfile(userId);
  if (!profile) {
    sendSuccess(res, null, 404);
    return;
  }
  sendSuccess(res, profile);
});

export const updateSkinProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await skinProfilesService.updateSkinProfile(userId, req.body);
  sendSuccess(res, result);
});
