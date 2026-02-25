import api from './api';

export const certificateService = {
  async list() {
    const { data } = await api.get('/certificates/');
    return data;
  },

  async claim(courseId) {
    const { data } = await api.post(`/certificates/claim/${courseId}/`);
    return data;
  },

  async verify(code) {
    const { data } = await api.get(`/certificates/verify/${code}/`);
    return data;
  },

  async downloadPdf(certId) {
    const response = await api.get(`/certificates/${certId}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default certificateService;
