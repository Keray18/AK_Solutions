import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { routines, routineSteps } from '../../db/schema/routines.js';
import { products, brands } from '../../db/schema/products.js';

export class RoutineRepository {
  static async createRoutine(userId: string, data: any) {
    return await db.transaction(async (tx) => {
      const [newRoutine] = await tx.insert(routines).values({
        userId,
        name: data.name,
        routineType: data.routineType,
      }).returning();

      if (!newRoutine) throw new Error('Routine not created');

      if (data.steps && data.steps.length > 0) {
        const stepsToInsert = data.steps.map((step: any) => ({
          routineId: newRoutine.id,
          ...step,
        }));
        await tx.insert(routineSteps).values(stepsToInsert);
      }

      return newRoutine;
    });
  }

  static async getUserRoutines(userId: string) {
    const userRoutines = await db
      .select()
      .from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(desc(routines.updatedAt));

    if (userRoutines.length === 0) return [];

    const routineIds = userRoutines.map(r => r.id);
    
    const steps = await db
      .select({
        step: routineSteps,
        product: products,
        brand: brands,
      })
      .from(routineSteps)
      .leftJoin(products, eq(routineSteps.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(inArray(routineSteps.routineId, routineIds))
      .orderBy(routineSteps.stepOrder);

    return userRoutines.map(routine => ({
      ...routine,
      steps: steps
        .filter(s => s.step.routineId === routine.id)
        .map(s => ({
          ...s.step,
          product: s.product ? { ...s.product, brand: s.brand } : null,
        }))
    }));
  }

  static async getRoutineById(userId: string, routineId: string) {
    const [routine] = await db
      .select()
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));

    if (!routine) return null;

    const steps = await db
      .select({
        step: routineSteps,
        product: products,
        brand: brands,
      })
      .from(routineSteps)
      .leftJoin(products, eq(routineSteps.productId, products.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(eq(routineSteps.routineId, routineId))
      .orderBy(routineSteps.stepOrder);

    return {
      ...routine,
      steps: steps.map(s => ({
        ...s.step,
        product: s.product ? { ...s.product, brand: s.brand } : null,
      }))
    };
  }

  static async updateRoutine(userId: string, routineId: string, data: any) {
    return await db.transaction(async (tx) => {
      if (data.name !== undefined || data.active !== undefined) {
        await tx.update(routines)
          .set({
            name: data.name,
            active: data.active,
            updatedAt: new Date(),
          })
          .where(and(eq(routines.id, routineId), eq(routines.userId, userId)));
      }

      if (data.steps) {
        // Replace all steps
        await tx.delete(routineSteps).where(eq(routineSteps.routineId, routineId));
        if (data.steps.length > 0) {
          const stepsToInsert = data.steps.map((step: any) => ({
            routineId: routineId,
            ...step,
          }));
          await tx.insert(routineSteps).values(stepsToInsert);
        }
      }

      return this.getRoutineById(userId, routineId);
    });
  }

  static async deleteRoutine(userId: string, routineId: string) {
    const [deleted] = await db.delete(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .returning({ id: routines.id });
    return deleted;
  }
}
