import api from './api';

export const blogService = {
  async list(params = {}) {
    const { data } = await api.get('/blog/', { params });
    return data;
  },

  async getBySlug(slug) {
    const { data } = await api.get(`/blog/${slug}/`);
    return data;
  },

  async create(postData) {
    const { data } = await api.post('/blog/', postData);
    return data;
  },

  async update(slug, postData) {
    const { data } = await api.patch(`/blog/${slug}/`, postData);
    return data;
  },

  async remove(slug) {
    await api.delete(`/blog/${slug}/`);
  },
};

export default blogService;
