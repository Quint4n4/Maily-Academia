import api from './api';

export const categoryService = {
  async list(params = {}) {
    const { data } = await api.get('/categories/', { params });
    return data;
  },
};

export default categoryService;

