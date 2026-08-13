import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { userProfiles, skinProfiles, skinProfileConcerns } from '../../db/schema/skinProfiles.js';
import { routines, routineSteps } from '../../db/schema/routines.js';
import { RoutineType } from '../../shared/types/enums.js';

export const onboardingRepository = {
  async getUserProfile(userId: string) {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
    return result[0] || null;
  },

  async upsertUserProfile(userId: string, data: Partial<typeof userProfiles.$inferInsert>) {
    const existing = await this.getUserProfile(userId);
    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(userProfiles)
        .values({ userId, ...data })
        .returning();
      return inserted;
    }
  },

  async getSkinProfile(userId: string) {
    const result = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userId)).limit(1);
    return result[0] || null;
  },

  async upsertSkinProfile(userId: string, data: Partial<typeof skinProfiles.$inferInsert>) {
    const existing = await this.getSkinProfile(userId);
    if (existing) {
      const [updated] = await db
        .update(skinProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(skinProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [inserted] = await db
        .insert(skinProfiles)
        .values({ userId, ...data })
        .returning();
      return inserted;
    }
  },

  async replaceSkinConcerns(skinProfileId: string, concerns: typeof skinProfileConcerns.$inferInsert[]) {
    return await db.transaction(async (tx) => {
      await tx.delete(skinProfileConcerns).where(eq(skinProfileConcerns.skinProfileId, skinProfileId));
      if (concerns.length > 0) {
        await tx.insert(skinProfileConcerns).values(concerns);
      }
    });
  },

  async getSkinConcerns(skinProfileId: string) {
    return await db.select().from(skinProfileConcerns).where(eq(skinProfileConcerns.skinProfileId, skinProfileId));
  },

  async upsertRoutine(userId: string, routineType: RoutineType, stepsData: Omit<typeof routineSteps.$inferInsert, 'routineId'>[]) {
    return await db.transaction(async (tx) => {
      // Find or create routine
      let routineId: string;
      const existingRoutine = await tx.select().from(routines).where(
        and(eq(routines.userId, userId), eq(routines.routineType, routineType))
      ).limit(1);

      if (existingRoutine.length > 0 && existingRoutine[0]) {
        routineId = existingRoutine[0].id;
        await tx.update(routines).set({ updatedAt: new Date() }).where(eq(routines.id, routineId));
      } else {
        const [inserted] = await tx.insert(routines).values({
          userId,
          routineType,
          name: routineType === RoutineType.MORNING ? 'Morning Routine' : 'Evening Routine',
        }).returning({ id: routines.id });
        if (!inserted) throw new Error('Failed to insert routine');
        routineId = inserted.id;
      }

      // Replace steps
      await tx.delete(routineSteps).where(eq(routineSteps.routineId, routineId));
      
      if (stepsData.length > 0) {
        const stepsToInsert = stepsData.map(step => ({ ...step, routineId }));
        await tx.insert(routineSteps).values(stepsToInsert);
      }
      
      return routineId;
    });
  },

  async getRoutines(userId: string) {
    const userRoutines = await db.select().from(routines).where(eq(routines.userId, userId));
    const result = [];
    for (const r of userRoutines) {
      const steps = await db.select().from(routineSteps).where(eq(routineSteps.routineId, r.id)).orderBy(routineSteps.stepOrder);
      result.push({ ...r, steps });
    }
    return result;
  }
};
