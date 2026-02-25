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

  async createInstructor(userData) {
    const { data } = await api.post('/users/instructors/', {
      email: userData.email,
      username: userData.username,
      first_name: userData.firstName,
      last_name: userData.lastName,
      password: userData.password,
    });
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
