import api from './api';

export const evaluationService = {
  // Alumno: obtener estado actual de la solicitud de evaluación final
  async getEvalRequest(courseId) {
    const { data } = await api.get(`/courses/${courseId}/final-evaluation/request/`);
    return data;
  },

  // Alumno: solicitar evaluación final
  async requestFinalEvaluation(courseId) {
    const { data } = await api.post(`/courses/${courseId}/final-evaluation/request/`);
    return data;
  },

  // Alumno: obtener evaluación final (si está aprobada y en ventana de tiempo)
  async getFinalEvaluation(courseId) {
    const { data } = await api.get(`/courses/${courseId}/final-evaluation/`);
    return data;
  },

  // Alumno: enviar respuestas de la evaluación final
  async submitFinalEvaluation(evaluationId, answers) {
    const { data } = await api.post(`/final-evaluations/${evaluationId}/attempt/`, {
      answers,
    });
    return data;
  },

  // Profesor: listar solicitudes de evaluación final de sus cursos
  async listRequests(params = {}) {
    const { data } = await api.get('/instructor/evaluations/requests/', {
      params,
    });
    return data;
  },

  // Profesor: aprobar una solicitud y definir duración en minutos
  async approveRequest(requestId, durationMinutes) {
    const { data } = await api.post(
      `/instructor/evaluations/requests/${requestId}/approve/`,
      { duration_minutes: durationMinutes },
    );
    return data;
  },

  // Profesor: obtener o crear evaluación final para un curso (gestión de preguntas)
  async getAdminEvaluation(courseId) {
    const { data } = await api.get(`/courses/${courseId}/final-evaluation/admin/`);
    return data;
  },

  // Profesor: actualizar título / passing_score de la evaluación final
  async updateAdminEvaluation(courseId, payload) {
    const { data } = await api.put(`/courses/${courseId}/final-evaluation/admin/`, payload);
    return data;
  },

  // Profesor: agregar pregunta a evaluación final
  async addFinalQuestion(evaluationId, questionData) {
    const { data } = await api.post(
      `/final-evaluations/${evaluationId}/questions/`,
      questionData,
    );
    return data;
  },

  // Profesor: actualizar pregunta de evaluación final
  async updateFinalQuestion(questionId, questionData) {
    const { data } = await api.patch(
      `/final-evaluation-questions/${questionId}/`,
      questionData,
    );
    return data;
  },

  // Profesor: eliminar pregunta de evaluación final
  async removeFinalQuestion(questionId) {
    await api.delete(`/final-evaluation-questions/${questionId}/`);
  },
};

export default evaluationService;

