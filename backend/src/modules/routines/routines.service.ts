import { RoutineRepository } from './routines.repository.js';
import { NotFoundError } from '../../shared/types/errors.js';

export class RoutinesService {
  static async createRoutine(userId: string, data: any) {
    // You could limit to one AM and one PM routine here if needed, or let them create multiple
    return await RoutineRepository.createRoutine(userId, data);
  }

  static async getUserRoutines(userId: string) {
    return await RoutineRepository.getUserRoutines(userId);
  }

  static async getRoutineById(userId: string, routineId: string) {
    const routine = await RoutineRepository.getRoutineById(userId, routineId);
    if (!routine) {
      throw new NotFoundError('Routine not found or belongs to another user.');
    }
    return routine;
  }

  static async updateRoutine(userId: string, routineId: string, data: any) {
    const existing = await RoutineRepository.getRoutineById(userId, routineId);
    if (!existing) {
      throw new NotFoundError('Routine not found or belongs to another user.');
    }
    return await RoutineRepository.updateRoutine(userId, routineId, data);
  }

  static async deleteRoutine(userId: string, routineId: string) {
    const deleted = await RoutineRepository.deleteRoutine(userId, routineId);
    if (!deleted) {
      throw new NotFoundError('Routine not found or belongs to another user.');
    }
    return { success: true };
  }
}
