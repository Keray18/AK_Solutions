import api from './api';

export const recommendationService = {
  getRecommendations: async () => {
    const response = await api.get('/recommendations');
    return response.data;
  },

  getRecommendationById: async (id: string) => {
    const response = await api.get(`/recommendations/${id}`);
    return response.data;
  },

  getReplacements: async (productId: string) => {
    const response = await api.post(`/products/${productId}/replacements`);
    return response.data;
  },

  compareProducts: async (productIds: string[]) => {
    const response = await api.post('/products/compare', { productIds });
    return response.data;
  },

  optimizeRoutine: async (routineId: string) => {
    const response = await api.post(`/routines/${routineId}/optimize`);
    return response.data;
  },

  applyOptimization: async (routineId: string, changes: any[]) => {
    const response = await api.post(`/routines/${routineId}/apply-optimization`, { changes });
    return response.data;
  }
};
