import api from './api';

export const quizService = {
  async getByModule(moduleId) {
    const { data } = await api.get(`/modules/${moduleId}/quiz/`);
    return data;
  },

  async create(moduleId, quizData) {
    const { data } = await api.post(`/modules/${moduleId}/quiz/create/`, quizData);
    return data;
  },

  async update(quizId, quizData) {
    const { data } = await api.patch(`/quizzes/${quizId}/`, quizData);
    return data;
  },

  async remove(quizId) {
    await api.delete(`/quizzes/${quizId}/`);
  },

  // Questions
  async addQuestion(quizId, questionData) {
    const { data } = await api.post(`/quizzes/${quizId}/questions/`, questionData);
    return data;
  },

  async updateQuestion(questionId, questionData) {
    const { data } = await api.patch(`/questions/${questionId}/`, questionData);
    return data;
  },

  async removeQuestion(questionId) {
    await api.delete(`/questions/${questionId}/`);
  },

  // Student
  async submitAttempt(quizId, answers) {
    const { data } = await api.post(`/quizzes/${quizId}/attempt/`, { answers });
    return data;
  },

  async getResults(quizId) {
    const { data } = await api.get(`/quizzes/${quizId}/results/`);
    return data;
  },
};

export default quizService;
