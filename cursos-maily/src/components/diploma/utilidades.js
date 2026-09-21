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

// --------------------------------------------------------------------------
// Ayudas de alineación
// --------------------------------------------------------------------------

/** Rejilla base: el arrastre cae a milímetros enteros, no a 104.63. */
export const PASO_MM = 1;

/** A cuántos milímetros del objetivo empieza a tirar el imán. */
export const UMBRAL_IMAN = 2;

/** Margen del contenido dentro del marco. Los textos de la semilla empiezan aquí. */
export const MARGEN_MM = 30;

/**
 * A dónde debería caer el elemento y qué líneas enseñarle al maestro.
 *
 * El problema que resuelve: arrastrando a mano, un título queda en 148.2 y el
 * de abajo en 147.9. Nadie lo ve en la pantalla y se nota en el papel.
 *
 * Devuelve la posición ya ajustada y las guías a pintar. Cada guía es una
 * línea en milímetros: `v` es vertical (una x), `h` es horizontal (una y).
 */
export function ajustarConIman(elemento, x, y, otros) {
  const ancho = elemento.ancho ?? 10;
  const alto = altoEnMm(elemento);

  // Las TRES primeras de cada eje son las de la hoja, y tienen prioridad.
  // El orden importa: `ajustarConIman` las separa por posición.
  const candidatasX = [
    // El centro de la hoja es la guía más útil de un diploma: casi todo va
    // centrado, y es imposible acertarlo a ojo.
    { linea: PAGINA.ancho / 2, destino: PAGINA.ancho / 2 - ancho / 2 },
    { linea: MARGEN_MM, destino: MARGEN_MM },
    { linea: PAGINA.ancho - MARGEN_MM, destino: PAGINA.ancho - MARGEN_MM - ancho },
  ];
  const candidatasY = [
    { linea: PAGINA.alto / 2, destino: PAGINA.alto / 2 - alto / 2 },
    { linea: MARGEN_MM, destino: MARGEN_MM },
    { linea: PAGINA.alto - MARGEN_MM, destino: PAGINA.alto - MARGEN_MM - alto },
  ];

  for (const otro of otros) {
    const oAncho = otro.ancho ?? 10;
    const oAlto = altoEnMm(otro);

    // Izquierda con izquierda, derecha con derecha, centro con centro.
    candidatasX.push({ linea: otro.x, destino: otro.x });
    candidatasX.push({ linea: otro.x + oAncho, destino: otro.x + oAncho - ancho });
    candidatasX.push({
      linea: otro.x + oAncho / 2,
      destino: otro.x + oAncho / 2 - ancho / 2,
    });

    candidatasY.push({ linea: otro.y, destino: otro.y });
    candidatasY.push({ linea: otro.y + oAlto, destino: otro.y + oAlto - alto });
    candidatasY.push({
      linea: otro.y + oAlto / 2,
      destino: otro.y + oAlto / 2 - alto / 2,
    });
  }

  // La hoja manda sobre los vecinos. Sin esta prioridad, un elemento que ya
  // esta torcido --y en una plantilla manoseada casi todos lo estan-- atrae a
  // los demas y el desalineo se propaga: el centro real de la pagina deja de
  // usarse porque siempre hay un vecino un poco mas cerca.
  const mejorX = _masCercana(candidatasX.slice(0, 3), x)
    ?? _masCercana(candidatasX.slice(3), x);
  const mejorY = _masCercana(candidatasY.slice(0, 3), y)
    ?? _masCercana(candidatasY.slice(3), y);

  const guias = [];
  if (mejorX) guias.push({ orientacion: 'v', pos: mejorX.linea });
  if (mejorY) guias.push({ orientacion: 'h', pos: mejorY.linea });

  return {
    // Sin imán cerca, cae a la rejilla de milímetros enteros.
    x: mejorX ? mejorX.destino : Math.round(x / PASO_MM) * PASO_MM,
    y: mejorY ? mejorY.destino : Math.round(y / PASO_MM) * PASO_MM,
    guias,
  };
}

function _masCercana(candidatas, valor) {
  let mejor = null;
  let distancia = UMBRAL_IMAN;
  for (const candidata of candidatas) {
    const actual = Math.abs(candidata.destino - valor);
    if (actual <= distancia) {
      distancia = actual;
      mejor = candidata;
    }
  }
  return mejor;
}

/** Coloca el elemento respecto a la hoja. Lo usan los botones del panel. */
export function alinearEnPagina(elemento, donde) {
  const ancho = elemento.ancho ?? 10;
  const alto = altoEnMm(elemento);

  switch (donde) {
    case 'centro-h':
      return { x: Number((PAGINA.ancho / 2 - ancho / 2).toFixed(2)) };
    case 'centro-v':
      return { y: Number((PAGINA.alto / 2 - alto / 2).toFixed(2)) };
    case 'izquierda':
      return { x: MARGEN_MM };
    case 'derecha':
      return { x: Number((PAGINA.ancho - MARGEN_MM - ancho).toFixed(2)) };
    case 'arriba':
      return { y: MARGEN_MM };
    case 'abajo':
      return { y: Number((PAGINA.alto - MARGEN_MM - alto).toFixed(2)) };
    default:
      return {};
  }
}
