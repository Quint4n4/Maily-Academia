import api from './api';

/**
 * Lista materiales de un curso.
 * @param {number|string} courseId
 * @param {{ module?: number|string, lesson?: number|string }} filters
 * @returns {Promise<{ results?: any[], count?: number } | any[]>}
 */
export async function list(courseId, filters = {}) {
  const params = {};
  if (filters.module != null) params.module = filters.module;
  if (filters.lesson != null) params.lesson = filters.lesson;
  const { data } = await api.get(`/courses/${courseId}/materials/`, { params });
  return data;
}

/**
 * Sube un material (multipart/form-data).
 * @param {number|string} courseId
 * @param {FormData} formData - campos: title, description (opc), file, module (opc), lesson (opc), order (opc)
 * @returns {Promise<object>}
 */
export async function upload(courseId, formData) {
  const { data } = await api.post(`/courses/${courseId}/materials/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Descarga el archivo del material (blob). El backend incrementa download_count.
 * @param {number|string} materialId
 * @returns {Promise<Blob>}
 */
export async function download(materialId) {
  const { data } = await api.get(`/materials/${materialId}/download/`, {
    responseType: 'blob',
  });
  return data;
}

/**
 * Actualiza título, descripción u orden de un material.
 * @param {number|string} materialId
 * @param {{ title?: string, description?: string, order?: number }} payload
 * @returns {Promise<object>}
 */
export async function update(materialId, payload) {
  const { data } = await api.patch(`/materials/${materialId}/`, payload);
  return data;
}

/**
 * Elimina un material.
 * @param {number|string} materialId
 */
export async function remove(materialId) {
  await api.delete(`/materials/${materialId}/`);
}

export default {
  list,
  upload,
  download,
  update,
  remove,
};
