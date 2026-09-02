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

  async exportUsersCSV(params = {}) {
    const { data } = await api.get('/users/export/csv/', { params, responseType: 'blob' });
    return data;
  },

  async exportPurchasesCSV(params = {}) {
    const { data } = await api.get('/users/purchases/export/csv/', { params, responseType: 'blob' });
    return data;
  },
};

// ===== CUPONES =====
export const getCoupons = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.get(`/admin/coupons/${query ? '?' + query : ''}`);
};

export const createCoupon = (data) =>
  api.post('/admin/coupons/', data);

export const updateCoupon = (id, data) =>
  api.patch(`/admin/coupons/${id}/`, data);

export const deleteCoupon = (id) =>
  api.delete(`/admin/coupons/${id}/`);

export const toggleCouponStatus = (id, isActive) =>
  api.patch(`/admin/coupons/${id}/`, { is_active: isActive });

export default adminService;
