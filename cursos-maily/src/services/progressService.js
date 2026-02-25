import api from './api';

export const progressService = {
  async completeLesson(lessonId) {
    const { data } = await api.post(`/lessons/${lessonId}/complete/`);
    return data;
  },

  async getCourseProgress(courseId) {
    const { data } = await api.get(`/progress/courses/${courseId}/`);
    return data;
  },

  async updateLessonPosition(lessonId, positionSeconds) {
    const { data } = await api.patch(`/lessons/${lessonId}/position/`, { position_seconds: positionSeconds });
    return data;
  },

  async getDashboard() {
    const { data } = await api.get('/progress/dashboard/');
    return data;
  },

  async getInstructorStats() {
    const { data } = await api.get('/progress/instructor-stats/');
    return data;
  },
};

export default progressService;
