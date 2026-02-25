import api from './api';

export const adminService = {
  async getPurchases() {
    const { data } = await api.get('/admin/purchases/');
    return data;
  },
};

export default adminService;
