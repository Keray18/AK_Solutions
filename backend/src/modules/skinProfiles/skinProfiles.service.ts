import { eq } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { userProfiles, skinProfiles, skinProfileConcerns } from '../../db/schema/skinProfiles.js';
import { routines, routineSteps } from '../../db/schema/routines.js';
import { NotFoundError } from '../../shared/types/errors.js';
import crypto from 'crypto';

export const skinProfilesService = {
  async getSkinProfile(userId: string) {
    const userProf = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    const skinProf = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userId)).limit(1);
    
    if (!userProf[0] || !skinProf[0]) {
      return null;
    }

    const concerns = await db.select().from(skinProfileConcerns).where(eq(skinProfileConcerns.skinProfileId, skinProf[0].id));
    
    // Also fetch routines to provide a full summary
    const userRoutines = await db.select().from(routines).where(eq(routines.userId, userId));
    const routinesWithCounts = await Promise.all(userRoutines.map(async (r) => {
      const steps = await db.select().from(routineSteps).where(eq(routineSteps.routineId, r.id));
      return {
        id: r.id,
        routineType: r.routineType,
        stepCount: steps.length
      };
    }));

    return {
      userProfile: userProf[0],
      skinProfile: skinProf[0],
      concerns: concerns,
      routines: routinesWithCounts
    };
  },

  async updateSkinProfile(userId: string, data: any) {
    return await db.transaction(async (tx) => {
      const userProf = await tx.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      const skinProf = await tx.select().from(skinProfiles).where(eq(skinProfiles.userId, userId)).limit(1);

      if (!userProf[0] || !skinProf[0]) {
        throw new NotFoundError('Profile');
      }

      const { skinType, sensitivity, ageRange, gender, climate, monthlyBudget, currency, budgetFlexibility } = data;

      let versionUpdated = false;

      // Update User Profile
      const userProfUpdate: any = {};
      if (ageRange !== undefined) userProfUpdate.ageRange = ageRange;
      if (gender !== undefined) userProfUpdate.gender = gender;
      if (climate !== undefined) userProfUpdate.climate = climate;
      if (monthlyBudget !== undefined) userProfUpdate.monthlyBudget = monthlyBudget.toString();
      if (currency !== undefined) userProfUpdate.currency = currency;
      if (budgetFlexibility !== undefined) userProfUpdate.budgetFlexibility = budgetFlexibility;

      if (Object.keys(userProfUpdate).length > 0) {
        await tx.update(userProfiles).set({ ...userProfUpdate, updatedAt: new Date() }).where(eq(userProfiles.userId, userId));
      }

      // Update Skin Profile
      const skinProfUpdate: any = {};
      if (skinType !== undefined && skinType !== skinProf[0].skinType) {
        skinProfUpdate.skinType = skinType;
        versionUpdated = true;
      }
      if (sensitivity !== undefined && sensitivity !== skinProf[0].sensitivity) {
        skinProfUpdate.sensitivity = sensitivity;
        versionUpdated = true;
      }

      if (versionUpdated) {
        skinProfUpdate.version = crypto.randomUUID();
      }

      if (Object.keys(skinProfUpdate).length > 0) {
        await tx.update(skinProfiles).set({ ...skinProfUpdate, updatedAt: new Date() }).where(eq(skinProfiles.userId, userId));
      }

      return { success: true, versionUpdated };
    });
  }
};
