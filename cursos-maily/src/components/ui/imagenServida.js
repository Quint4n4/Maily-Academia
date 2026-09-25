/**
 * Pedirle a Cloudinary la imagen al tamaño en que se va a ver.
 *
 * El backend guarda la `secure_url` tal cual la devuelve la subida
 * (`backend/apps/courses/views.py`), sin ninguna transformación: si un
 * instructor sube una foto de 4000 px y 4 MB, esa es la que descarga cada
 * visitante en cada tarjeta del catálogo. Cloudinary sirve la versión útil con
 * solo pedírselo en la URL:
 *
 *   f_auto  el formato que mejor soporte ese navegador (WebP, AVIF)
 *   q_auto  la calidad más baja que no se note
 *   w_800   ancho de sobra para la tarjeta más grande, incluso en pantalla
 *           densa, y sobre todo un TECHO para lo que alguien suba
 *
 * Se hace al servir y no al subir a propósito: no cambia ni un dato guardado,
 * así que si esto resultara mal se quita y las URLs originales siguen intactas.
 *
 * Vive en su propio archivo y no junto a `CourseThumbnail` porque un archivo
 * que exporta componentes Y funciones rompe el recargado en caliente de Vite:
 * al cambiar la función, React no sabe si puede conservar el estado y recarga
 * la página entera.
 */
const ANCHO_MAXIMO = 800;

/**
 * Deja intacta cualquier URL que no sea de Cloudinary --Unsplash, una ruta
 * local, un avatar generado-- y también las que ya traen transformaciones
 * puestas a mano, para no pisar una decisión deliberada.
 */
export const imagenServida = (url) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

  const marca = '/upload/';
  const i = url.indexOf(marca);
  if (i === -1) return url;

  const despues = url.slice(i + marca.length);
  // `v123456/` es la versión, no una transformación. Cualquier otra cosa antes
  // de la carpeta significa que alguien ya puso transformaciones.
  if (!/^(v\d+\/)?[\w-]+\//.test(despues)) return url;

  return `${url.slice(0, i + marca.length)}f_auto,q_auto,w_${ANCHO_MAXIMO}/${despues}`;
};

export default imagenServida;
