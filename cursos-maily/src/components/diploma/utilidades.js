/**
 * Conversiones del editor de diplomas.
 *
 * Aqui vive TODA la traduccion entre lo que se guarda y lo que se pinta:
 *
 *   se guarda -> milimetros, origen arriba-izquierda, pagina de 297 x 210 mm
 *   se pinta  -> pixeles del navegador, que dependen del ancho de la pantalla
 *
 * Si esta conversion se reparte por los componentes, un dia difieren y el
 * elemento aparece en un sitio distinto al que se guardo.
 */

export const PAGINA = { ancho: 297, alto: 210 };

/** Un punto tipografico en milimetros. 72 pt = 1 pulgada = 25.4 mm. */
export const MM_POR_PUNTO = 25.4 / 72;

/** Familias que existen en el servidor Y en el navegador. */
export const FUENTES = {
  'sans': { css: 'Helvetica, Arial, sans-serif', weight: 400, style: 'normal', etiqueta: 'Sans' },
  'sans-bold': { css: 'Helvetica, Arial, sans-serif', weight: 700, style: 'normal', etiqueta: 'Sans negrita' },
  'sans-italic': { css: 'Helvetica, Arial, sans-serif', weight: 400, style: 'italic', etiqueta: 'Sans cursiva' },
  'sans-bold-italic': { css: 'Helvetica, Arial, sans-serif', weight: 700, style: 'italic', etiqueta: 'Sans negrita cursiva' },
  'serif': { css: '"Times New Roman", Times, serif', weight: 400, style: 'normal', etiqueta: 'Serif' },
  'serif-bold': { css: '"Times New Roman", Times, serif', weight: 700, style: 'normal', etiqueta: 'Serif negrita' },
  'serif-italic': { css: '"Times New Roman", Times, serif', weight: 400, style: 'italic', etiqueta: 'Serif cursiva' },
  'mono': { css: '"Courier New", Courier, monospace', weight: 400, style: 'normal', etiqueta: 'Monoespaciada' },
};

export const CAMPOS = {
  alumno: 'Nombre del alumno',
  curso: 'Nombre del curso',
  maestro: 'Nombre del maestro',
  academia: 'Academia',
  fecha: 'Fecha de emisión',
  codigo: 'Código de verificación',
};

export const TIPOS = {
  campo: 'Variable',
  texto: 'Texto',
  imagen: 'Imagen',
  qr: 'Código QR',
  linea: 'Línea',
  sello: 'Sello',
};

/** Texto de ejemplo del lienzo. El PDF de verdad lleva los datos reales. */
export const EJEMPLOS = {
  alumno: 'María Fernanda Rodríguez',
  curso: 'Introducción a la Medicina Regenerativa',
  maestro: 'Carlos Rodríguez',
  academia: 'Longevity 360',
  fecha: '21 de septiembre de 2026',
  codigo: '00000000-0000-4000-8000-000000000000',
};

/**
 * Alto que ocupa un elemento, en milimetros.
 *
 * El documento no guarda el alto de un texto --lo decide la fuente-- pero el
 * editor necesita un rectangulo para poder agarrarlo.
 */
export function altoEnMm(elemento) {
  if (elemento.tipo === 'imagen') return elemento.alto ?? elemento.ancho ?? 10;
  if (elemento.tipo === 'qr' || elemento.tipo === 'sello') return elemento.ancho ?? 20;
  if (elemento.tipo === 'linea') return 3; // area minima para poder pulsarla
  const lineas = elemento.max_lineas ?? 1;
  return (elemento.tamano ?? 12) * MM_POR_PUNTO * 1.25 * lineas;
}

/** Lo que se ve dentro del elemento en el lienzo. */
export function textoDe(elemento) {
  if (elemento.tipo === 'campo') return EJEMPLOS[elemento.campo] ?? elemento.campo ?? '';
  if (elemento.tipo === 'texto') {
    return (elemento.contenido ?? '').replace(
      /\{(\w+)\}/g,
      (coincidencia, nombre) => EJEMPLOS[nombre] ?? coincidencia,
    );
  }
  return '';
}

/** Estilo CSS de un texto, a la escala del lienzo. */
export function estiloDeTexto(elemento, escala) {
  const fuente = FUENTES[elemento.fuente] ?? FUENTES.sans;
  return {
    fontFamily: fuente.css,
    fontWeight: fuente.weight,
    fontStyle: fuente.style,
    fontSize: `${(elemento.tamano ?? 12) * MM_POR_PUNTO * escala}px`,
    lineHeight: 1.25,
    color: elemento.color ?? '#000000',
    textAlign: elemento.align ?? 'left',
    textTransform: elemento.mayusculas ? 'uppercase' : 'none',
    letterSpacing: elemento.espaciado
      ? `${elemento.espaciado * 0.3528 * escala}px`
      : 'normal',
    whiteSpace: (elemento.max_lineas ?? 1) > 1 ? 'normal' : 'nowrap',
    overflow: 'hidden',
  };
}

/** Mantiene un valor dentro de la pagina. */
export function dentroDePagina(elemento) {
  const ancho = Math.max(1, Math.min(elemento.ancho ?? 10, PAGINA.ancho));
  const alto = altoEnMm({ ...elemento, ancho });
  return {
    ...elemento,
    ancho,
    x: Math.max(0, Math.min(elemento.x ?? 0, PAGINA.ancho - ancho)),
    y: Math.max(0, Math.min(elemento.y ?? 0, PAGINA.alto - alto)),
  };
}

/** Un id que no choque con los que ya hay. */
export function idNuevo(elementos, prefijo) {
  const usados = new Set(elementos.map((e) => e.id));
  let numero = 1;
  while (usados.has(`${prefijo}-${numero}`)) numero += 1;
  return `${prefijo}-${numero}`;
}

/** Elemento recien creado, centrado en el ancho util. */
export function elementoNuevo(tipo, elementos) {
  const base = { id: idNuevo(elementos, tipo), tipo, x: 30, y: 100, ancho: 100 };

  switch (tipo) {
    case 'campo':
      return { ...base, campo: 'alumno', ancho: 237, x: 30,
        fuente: 'sans-bold', tamano: 18, color: '#1b1c19', align: 'center' };
    case 'texto':
      return { ...base, contenido: 'Texto nuevo', ancho: 237, x: 30,
        fuente: 'sans', tamano: 12, color: '#5c5b5a', align: 'center' };
    case 'imagen':
      return { ...base, recurso_id: null, ancho: 40, alto: 25 };
    case 'qr':
      return { ...base, ancho: 22 };
    case 'sello':
      return { ...base, ancho: 22, contenido: 'A360', color: '#845400' };
    case 'linea':
      return { ...base, ancho: 60, grosor: 0.8, color: '#845400' };
    default:
      return base;
  }
}
