import { onboardingRepository } from './onboarding.repository.js';
import { determineSkinType, SkinTypeSignals } from './skinTypeSuggestion.engine.js';
import { SkinType, RoutineType, ConcernPriority, SkinConcern } from '../../shared/types/enums.js';
import { BadRequestError } from '../../shared/types/errors.js';

export const onboardingService = {
  async getStatus(userId: string) {
    const profile = await onboardingRepository.getUserProfile(userId);
    if (!profile) {
      return {
        started: false,
        completed: false,
        currentStep: 'welcome',
      };
    }
    
    return {
      started: !!profile.onboardingStartedAt,
      completed: profile.onboardingCompleted,
      currentStep: profile.onboardingStep || 'welcome',
    };
  },

  async markStep(userId: string, stepName: string) {
    const profile = await onboardingRepository.getUserProfile(userId);
    const isStarted = !!profile?.onboardingStartedAt;
    
    await onboardingRepository.upsertUserProfile(userId, {
      onboardingStep: stepName,
      ...(isStarted ? {} : { onboardingStartedAt: new Date() })
    });
  },

  async saveProfile(userId: string, data: any) {
    await onboardingRepository.upsertUserProfile(userId, data);
    await this.markStep(userId, 'skin-type');
  },

  async saveSkinType(userId: string, data: { skinType?: SkinType; isGuided?: boolean; guidedInputs?: any }) {
    let finalSkinType = data.skinType;
    let suggestionReason = undefined;

    if (data.isGuided && data.guidedInputs) {
      const result = determineSkinType(data.guidedInputs as SkinTypeSignals);
      finalSkinType = result.skinType;
      suggestionReason = result.reason;
    }

    if (!finalSkinType) {
      throw new BadRequestError('Skin type is required');
    }

    await onboardingRepository.upsertSkinProfile(userId, {
      skinType: finalSkinType
    });

    await this.markStep(userId, 'concerns');

    return { skinType: finalSkinType, reason: suggestionReason };
  },

  async saveConcerns(userId: string, data: { primary: SkinConcern; secondary?: SkinConcern[] }) {
    const skinProfile = await onboardingRepository.getSkinProfile(userId);
    if (!skinProfile) {
      throw new BadRequestError('Skin profile must be created first');
    }

    const allConcerns = new Set<SkinConcern>();
    allConcerns.add(data.primary);
    
    const concernsToInsert = [{
      skinProfileId: skinProfile.id,
      concernType: data.primary,
      priority: ConcernPriority.PRIMARY,
    }];

    if (data.secondary) {
      for (const sc of data.secondary) {
        if (!allConcerns.has(sc)) {
          allConcerns.add(sc);
          concernsToInsert.push({
            skinProfileId: skinProfile.id,
            concernType: sc,
            priority: ConcernPriority.SECONDARY,
          });
        }
      }
    }

    if (concernsToInsert.length > 5) {
      throw new BadRequestError('Maximum of 1 primary and 4 secondary concerns allowed');
    }

    await onboardingRepository.replaceSkinConcerns(skinProfile.id, concernsToInsert);
    await this.markStep(userId, 'sensitivity');
  },

  async saveSensitivity(userId: string, data: any) {
    await onboardingRepository.upsertSkinProfile(userId, data);
    await this.markStep(userId, 'lifestyle');
  },

  async saveLifestyle(userId: string, data: any) {
    const existing = await onboardingRepository.getUserProfile(userId);
    const mergedLifestyle = { ...(existing?.lifestyle || {}), ...data };
    await onboardingRepository.upsertUserProfile(userId, { lifestyle: mergedLifestyle });
    await this.markStep(userId, 'environment');
  },

  async saveEnvironment(userId: string, data: any) {
    await onboardingRepository.upsertUserProfile(userId, data);
    await this.markStep(userId, 'budget');
  },

  async saveBudget(userId: string, data: any) {
    await onboardingRepository.upsertUserProfile(userId, data);
    await this.markStep(userId, 'routine');
  },

  async saveRoutine(userId: string, data: { routineType: RoutineType, steps: any[] }) {
    await onboardingRepository.upsertRoutine(userId, data.routineType, data.steps);
    // If they save PM routine (which is second usually), we can mark next step review
    // We'll just mark it review regardless so they can proceed
    await this.markStep(userId, 'review');
  },

  async complete(userId: string) {
    const userProfile = await onboardingRepository.getUserProfile(userId);
    const skinProfile = await onboardingRepository.getSkinProfile(userId);

    if (!userProfile) {
      throw new BadRequestError('User profile not found');
    }
    if (!skinProfile) {
      throw new BadRequestError('Skin profile not found');
    }
    if (!skinProfile.skinType) {
      throw new BadRequestError('Skin type is required to complete onboarding');
    }

    const concerns = await onboardingRepository.getSkinConcerns(skinProfile.id);
    if (concerns.length === 0) {
      throw new BadRequestError('At least one primary concern is required');
    }

    await onboardingRepository.upsertUserProfile(userId, {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    });

    return { success: true };
  }
};
