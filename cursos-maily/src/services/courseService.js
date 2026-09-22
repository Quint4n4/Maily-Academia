import api from './api';

export const courseService = {
  async list(params = {}) {
    const { data } = await api.get('/courses/', { params });
    return data;
  },

  /**
   * Cursos gratuitos para la portada publica.
   *
   * No exige sesion: el backend responde con lo que ve un anonimo, que son los
   * cursos de las academias con vitrina. Un curso gratis de una academia
   * cerrada NO sale, y eso lo decide el backend, no este metodo.
   *
   * @param {number} cuantos cuantas tarjetas necesita la portada
   */
  async listarGratuitos(cuantos = 3) {
    const { data } = await api.get('/courses/', { params: { free: 'true' } });
    // Se recorta aqui y no con un `page_size`: la paginacion del backend no
    // acepta ese parametro --haria falta `page_size_query_param` en la
    // configuracion de DRF, que afecta a toda la API-- asi que mandarlo daria
    // la falsa impresion de que limita algo. Llegan hasta 20 y se usan 3.
    return (data?.results ?? data ?? []).slice(0, cuantos);
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

  /**
   * URL de reproduccion de una leccion.
   *
   * Se pide al servidor en vez de construirla en el navegador: para los
   * proveedores de pago la URL va firmada, y la clave de firma no puede salir
   * del backend. El servidor comprueba ademas que este usuario tenga acceso al
   * curso antes de entregarla.
   */
  async urlDeVideo(lessonId) {
    const { data } = await api.get(`/courses/lessons/${lessonId}/video/`);
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
