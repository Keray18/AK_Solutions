import api from './api';

export const routineService = {
  async getUserRoutines() {
    const response = await api.get('/routines');
    return response.data.data;
  },

  async getRoutineById(id: string) {
    const response = await api.get(`/routines/${id}`);
    return response.data.data;
  },

  async getAnalysis(id: string) {
    const response = await api.get(`/routines/${id}/analysis`);
    return response.data.data;
  },

  async analyzeRoutine(id: string) {
    const response = await api.post(`/routines/${id}/analyze`);
    return response.data.data;
  },

  async updateRoutine(id: string, data: Record<string, unknown>) {
    const response = await api.patch(`/routines/${id}`, data);
    return response.data.data;
  }
};
