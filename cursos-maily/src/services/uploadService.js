import api from './api';

/**
 * Sube una imagen al backend; el backend la sube a Cloudinary y devuelve la URL.
 * @param {File} file - Archivo de imagen (jpeg, png, gif, webp), máx. 5 MB.
 * @returns {Promise<string>} URL pública de la imagen.
 */
export async function uploadCourseThumbnail(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/courses/upload-thumbnail/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
