import api from './api';

export const qnaService = {
  async getQuestions(lessonId) {
    const { data } = await api.get(`/lessons/${lessonId}/questions/`);
    return data;
  },

  async createQuestion(lessonId, questionData) {
    const { data } = await api.post(`/lessons/${lessonId}/questions/create/`, questionData);
    return data;
  },

  async createAnswer(questionId, body) {
    const { data } = await api.post(`/questions/${questionId}/answers/`, { body });
    return data;
  },

  async acceptAnswer(answerId) {
    const { data } = await api.patch(`/answers/${answerId}/accept/`);
    return data;
  },

  async getInstructorStats() {
    const { data } = await api.get('/qna/instructor-stats/');
    return data;
  },
};

export default qnaService;
