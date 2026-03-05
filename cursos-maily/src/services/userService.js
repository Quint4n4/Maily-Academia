import api from './api';

export const userService = {
  async list(params = {}) {
    const { data } = await api.get('/users/', { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/users/${id}/`);
    return data;
  },

  async getSections() {
    const { data } = await api.get('/sections/');
    return Array.isArray(data) ? data : (data.results || []);
  },

  async createStudent(userData) {
    const payload = {
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      phone: userData.phone,
      password: userData.password,
      section_slugs: userData.sectionSlugs || [],
    };
    const { data } = await api.post('/users/students/', payload);
    return data;
  },

  async createInstructor(userData) {
    const payload = {
      email: userData.email,
      username: userData.username,
      first_name: userData.firstName,
      last_name: userData.lastName,
      password: userData.password,
    };
    if (userData.sectionSlug !== undefined) payload.section_slug = userData.sectionSlug;
    const { data } = await api.post('/users/instructors/', payload);
    return data;
  },

  async update(id, userData) {
    const payload = {};
    if (userData.firstName !== undefined) payload.first_name = userData.firstName;
    if (userData.first_name !== undefined) payload.first_name = userData.first_name;
    if (userData.lastName !== undefined) payload.last_name = userData.lastName;
    if (userData.last_name !== undefined) payload.last_name = userData.last_name;
    if (userData.role !== undefined) payload.role = userData.role;
    if (userData.isActive !== undefined) payload.is_active = userData.isActive;
    if (userData.phone !== undefined) payload.phone = userData.phone;
    if (userData.section_slug !== undefined) payload.section_slug = userData.section_slug;
    const { data } = await api.patch(`/users/${id}/`, payload);
    return data;
  },

  async deactivate(id) {
    await api.delete(`/users/${id}/`);
  },

  async changePassword(id, newPassword) {
    const { data } = await api.post(`/users/${id}/change-password/`, {
      new_password: newPassword,
    });
    return data;
  },

  async unlockAccount(id) {
    const { data } = await api.post(`/users/${id}/unlock/`);
    return data;
  },
};

export default userService;
