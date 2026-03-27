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

  async getRevenue() {
    const { data } = await api.get('/instructor/revenue/');
    return data;
  },
};

export default instructorService;

// ─── Analytics avanzados ────────────────────────────────────────────────────────

export const getRevenueAnalytics = (startDate, endDate, courseId = null, groupBy = 'day') => {
  const params = { start_date: startDate, end_date: endDate, group_by: groupBy };
  if (courseId) params.course_id = courseId;
  return api.get('/instructor/analytics/revenue/', { params }).then(({ data }) => data);
};

export const getTrendsAnalytics = (courseId = null) => {
  const params = courseId ? { course_id: courseId } : {};
  return api.get('/instructor/analytics/trends/', { params }).then(({ data }) => data);
};

export const getInstructorsAnalytics = () =>
  api.get('/instructor/analytics/instructors/').then(({ data }) => data);

export const getEngagementAnalytics = (courseId) =>
  api.get('/instructor/analytics/engagement/', { params: { course_id: courseId } }).then(({ data }) => data);

export const getDropoutAnalytics = (courseId) =>
  api.get('/instructor/analytics/dropout/', { params: { course_id: courseId } }).then(({ data }) => data);
