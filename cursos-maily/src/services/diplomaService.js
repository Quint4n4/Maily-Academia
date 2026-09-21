import api from './api';

/**
 * Plantillas y recursos del editor de diplomas.
 *
 * El documento que viaja aqui esta en MILIMETROS, con el origen en la esquina
 * superior izquierda de una pagina de 297 x 210 mm. El editor convierte a
 * pixeles solo para pintar; lo que se guarda son milimetros. En pixeles, el
 * diploma se descuadraria segun el monitor de quien lo edito.
 */

export const PAGINA_MM = { ancho: 297, alto: 210 };

/** Lista las plantillas que este usuario puede usar. */
export async function listarPlantillas() {
  const { data } = await api.get('/diplomas/plantillas/');
  return data.results ?? data;
}

export async function obtenerPlantilla(id) {
  const { data } = await api.get(`/diplomas/plantillas/${id}/`);
  return data;
}

/**
 * Crea una plantilla duplicando otra, o la de la plataforma si no se indica.
 * @param {{ nombre: string, copiarDe?: number }} datos
 */
export async function crearPlantilla({ nombre, copiarDe }) {
  const cuerpo = { nombre };
  if (copiarDe != null) cuerpo.copiar_de = copiarDe;
  const { data } = await api.post('/diplomas/plantillas/', cuerpo);
  return data;
}

/** Guarda el documento. Lanza si el backend lo rechaza: ver `erroresDeDocumento`. */
export async function guardarDocumento(id, documento) {
  const { data } = await api.patch(`/diplomas/plantillas/${id}/`, { documento });
  return data;
}

export async function borrarPlantilla(id) {
  await api.delete(`/diplomas/plantillas/${id}/`);
}

/**
 * Pide el PDF real al servidor.
 *
 * No se dibuja el PDF en el navegador a proposito: el lienzo del editor es una
 * aproximacion --el navegador mide el texto distinto a ReportLab-- y la unica
 * forma de no mentir es que lo dibuje el mismo codigo que emitira el diploma.
 *
 * @param {number} id
 * @param {object} [documento] Para ver cambios sin guardarlos.
 * @returns {Promise<Blob>}
 */
export async function previsualizar(id, documento) {
  const { data } = await api.post(
    `/diplomas/plantillas/${id}/preview/`,
    documento ? { documento } : {},
    { responseType: 'blob' },
  );
  return data;
}

/** La galeria de marcos, logos y sellos. */
export async function listarRecursos(tipo) {
  const { data } = await api.get('/diplomas/recursos/', {
    params: tipo ? { tipo } : undefined,
  });
  return data.results ?? data;
}

/**
 * Sube una imagen a la galeria.
 * @param {{ archivo: File, tipo: string, nombre?: string }} datos
 */
export async function subirRecurso({ archivo, tipo, nombre }) {
  const formulario = new FormData();
  formulario.append('archivo', archivo);
  formulario.append('tipo', tipo);
  if (nombre) formulario.append('nombre', nombre);

  const { data } = await api.post('/diplomas/recursos/', formulario, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function borrarRecurso(id) {
  await api.delete(`/diplomas/recursos/${id}/`);
}

/**
 * Saca los errores por elemento de una respuesta 400.
 *
 * DRF los anida bajo el nombre del campo, asi que llegan un nivel mas abajo de
 * lo que uno espera:
 *   { documento: { documento: [...], elementos: { e3: [...] } } }
 *
 * @returns {{ generales: string[], porElemento: Record<string, string[]> }}
 */
export function erroresDeDocumento(error) {
  const cuerpo = error?.response?.data?.documento ?? {};
  return {
    generales: cuerpo.documento ?? [],
    porElemento: cuerpo.elementos ?? {},
  };
}

export default {
  PAGINA_MM,
  listarPlantillas,
  obtenerPlantilla,
  crearPlantilla,
  guardarDocumento,
  borrarPlantilla,
  previsualizar,
  listarRecursos,
  subirRecurso,
  borrarRecurso,
  erroresDeDocumento,
};
