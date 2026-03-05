import api from './api';

export const adminService = {
  async getPurchases() {
    const { data } = await api.get('/admin/purchases/');
    return data;
  },

  async getRevenueAnalytics(params = {}) {
    const { data } = await api.get('/admin/analytics/revenue/', { params });
    return data;
  },

  async getUsersAnalytics() {
    const { data } = await api.get('/admin/analytics/users/');
    return data;
  },

  async getCoursesAnalytics() {
    const { data } = await api.get('/admin/analytics/courses/');
    return data;
  },

  async getSectionsAnalytics() {
    const { data } = await api.get('/admin/analytics/sections/');
    return data;
  },

  async getSectionMembers(slug) {
    const { data } = await api.get(`/admin/sections/${slug}/members/`);
    return Array.isArray(data) ? data : (data.results || []);
  },

  async addStudentToSection(slug, userId) {
    const { data } = await api.post(`/admin/sections/${slug}/members/`, {
      user_id: userId,
      role: 'student',
    });
    return data;
  },

  async removeStudentFromSection(slug, userId) {
    await api.delete(`/admin/sections/${slug}/members/${userId}/`);
  },
};

export default adminService;
