import api from './api';

export const courseService = {
  async list(params = {}) {
    const { data } = await api.get('/courses/', { params });
    return data;
  },

  async getRecommended(sectionSlug = null) {
    const params = sectionSlug ? { section: sectionSlug } : {};
    const { data } = await api.get('/courses/recommended/', { params });
    return data;
  },

  async listBySection(sectionSlug, params = {}) {
    const { data } = await api.get(`/sections/${sectionSlug}/courses/`, { params });
    return data;
  },

  async getById(id) {
    const { data } = await api.get(`/courses/${id}/`);
    return data;
  },

  async create(courseData) {
    const { data } = await api.post('/courses/', courseData);
    return data;
  },

  async update(id, courseData) {
    const { data } = await api.patch(`/courses/${id}/`, courseData);
    return data;
  },

  async remove(id) {
    await api.delete(`/courses/${id}/`);
  },

  async enroll(courseId) {
    const { data } = await api.post(`/courses/${courseId}/enroll/`);
    return data;
  },

  async purchaseCourse(courseId, cardData) {
    const { data } = await api.post(`/courses/${courseId}/purchase/`, cardData);
    return data;
  },

  async getStudents(courseId) {
    const { data } = await api.get(`/courses/${courseId}/students/`);
    return data;
  },

  // Modules
  async createModule(courseId, moduleData) {
    const { data } = await api.post(`/courses/${courseId}/modules/`, moduleData);
    return data;
  },

  async updateModule(moduleId, moduleData) {
    const { data } = await api.patch(`/courses/modules/${moduleId}/`, moduleData);
    return data;
  },

  async deleteModule(moduleId) {
    await api.delete(`/courses/modules/${moduleId}/`);
  },

  // Lessons
  async createLesson(moduleId, lessonData) {
    const { data } = await api.post(`/courses/modules/${moduleId}/lessons/`, lessonData);
    return data;
  },

  async updateLesson(lessonId, lessonData) {
    const { data } = await api.patch(`/courses/lessons/${lessonId}/`, lessonData);
    return data;
  },

  async deleteLesson(lessonId) {
    await api.delete(`/courses/lessons/${lessonId}/`);
  },

  // Reordering
  async reorderModules(courseId, orderedIds) {
    const { data } = await api.patch(`/courses/${courseId}/modules/reorder/`, { order: orderedIds });
    return data;
  },

  async reorderLessons(moduleId, orderedIds) {
    const { data } = await api.patch(`/courses/modules/${moduleId}/lessons/reorder/`, { order: orderedIds });
    return data;
  },
};

export default courseService;
