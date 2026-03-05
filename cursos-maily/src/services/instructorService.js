import api from './api';

export const instructorService = {
  async getStudents(params = {}) {
    const { data } = await api.get('/instructor/students/', { params });
    return data;
  },

  async getStudentDetail(id) {
    const { data } = await api.get(`/instructor/students/${id}/`);
    return data;
  },

  async getStudentActivity(id) {
    const { data } = await api.get(`/instructor/students/${id}/activity/`);
    return data;
  },

  async getStudentCertificates(id) {
    const { data } = await api.get(`/instructor/students/${id}/certificates/`);
    return data;
  },

  async getStudentSubmissions(id) {
    const { data } = await api.get(`/instructor/students/${id}/submissions/`);
    return data;
  },

  async getCourseAnalytics(courseId) {
    const { data } = await api.get(`/instructor/courses/${courseId}/analytics/`);
    return data;
  },
};

export default instructorService;
