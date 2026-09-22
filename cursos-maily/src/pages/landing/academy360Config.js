/**
 * Contenido de la landing de Academy360.
 *
 * Separado de los componentes para que cambiar un texto o una foto no obligue
 * a tocar JSX. Las rutas de imagen apuntan a `public/`: mientras no existan, el
 * componente pinta un marcador con las medidas que hacen falta, en vez de un
 * hueco roto.
 *
 * Medidas: las de `min` son el mínimo para que la foto no se vea borrosa en
 * pantallas de alta densidad. Son el doble de lo que ocupa en pantalla.
 */

export const MARCA = {
  nombre: 'Academy360',
  logo: '/logo-academy360.png',
  anio: new Date().getFullYear(),
};

/** Fotos del carrusel del hero. Con una sola, no salen flechas ni puntos. */
export const HERO_FOTOS = [
  { src: '/landing/hero-1.jpg', min: '1440 px de alto', alt: '' },
  { src: '/landing/hero-2.jpg', min: '1440 px de alto', alt: '' },
  { src: '/landing/hero-3.jpg', min: '1440 px de alto', alt: '' },
  { src: '/landing/hero-4.jpg', min: '1440 px de alto', alt: '' },
];

export const HERO = {
  eyebrow: 'Cursos de salud en línea',
  titulo: 'Aprende salud con',
  tituloDestacado: 'quienes la ejercen.',
  texto:
    'Academy360 reúne cursos en distintas áreas de la salud, impartidos por '
    + 'docentes especialistas. Empieza con los gratuitos y avanza a tu ritmo.',
  ctaPrincipal: { texto: 'Empieza gratis', a: '/login' },
  ctaSecundario: { texto: 'Ver las academias', a: '#academias' },
};

export const NAVEGACION = [
  { texto: 'Academias', a: '#academias' },
  { texto: 'Áreas', a: '#areas' },
  { texto: 'Docentes', a: '#docentes' },
];

/** Cuántos videos tiene el feed de cada academia. */
export const VIDEOS_POR_ACADEMIA = 10;

/**
 * Los archivos de video de una academia, numerados.
 *
 * Se generan en vez de escribirse a mano: treinta entradas repetidas son
 * treinta sitios donde equivocarse, y cambiar la cantidad obligaría a
 * reescribirlas todas.
 */
const videosDe = (slug) => Array.from({ length: VIDEOS_POR_ACADEMIA }, (_, i) => ({
  src: `/academias/${slug}-${i + 1}.mp4`,
  numero: i + 1,
}));

/**
 * Las tres academias.
 *
 * Cada una abre un panel a pantalla completa --al estilo de TikTok, video
 * vertical y texto encima-- con su video, su descripción y un botón.
 *
 * `video` y `poster` viven en `public/academias/`. Mientras no existan, la
 * tarjeta usa `imagen` y el panel muestra un marcador con las medidas.
 */
export const ACADEMIAS = {
  titulo: 'Nuestras academias',
  subtitulo: 'Tres caminos, según lo que necesites aprender.',
  lista: [
    {
      slug: 'maily-academia',
      videos: videosDe('maily'),
      nombre: 'Maily',
      resumen: 'Aprende a manejar nuestro software.',
      imagen: '/academias/maily.jpg',
      video: '/academias/maily.mp4',
      descripcion:
        'La academia de Maily está dedicada a que domines el software: '
        + 'desde lo básico hasta lo que casi nadie usa. Cursos cortos, '
        + 'hechos por quienes lo construyeron.',
      // PENDIENTE: Emanuel pasa la dirección de la página de Maily Soft.
      // Hasta entonces el botón lleva al login, para no dejar un enlace muerto.
      cta: { texto: 'Conocer más', a: null, externo: true },
    },
    {
      slug: 'longevity-360',
      videos: videosDe('longevity'),
      nombre: 'Longevity 360',
      resumen: 'Cursos de salud, abiertos a cualquiera.',
      imagen: '/academias/longevity.jpg',
      video: '/academias/longevity.mp4',
      descripcion:
        'Nuestra academia abierta. Nutrición, longevidad, salud cerebral y '
        + 'medicina preventiva, impartidos por especialistas que ejercen. '
        + 'Crea tu cuenta y empieza por los cursos gratuitos.',
      cta: { texto: 'Crear mi cuenta', a: '/login' },
    },
    {
      slug: 'corporativo-camsa',
      videos: videosDe('camsa'),
      nombre: 'Corporativo CAMSA',
      resumen: '¿Eres parte de nuestra familia?',
      imagen: '/academias/camsa.jpg',
      video: '/academias/camsa.mp4',
      descripcion:
        '¿Eres parte de nuestra familia? Entra a Corporativo CAMSA y '
        + 'actualiza tus conocimientos. Formación interna para el equipo, '
        + 'con lo que hace falta saber en cada área.',
      cta: { texto: 'Entrar', a: '/login' },
    },
  ],
  medidaFoto: { css: '384 × 288', min: '768 × 576' },
  medidaVideo: { css: '9:16 vertical', min: '720 × 1280' },
  // El feed vuelve al primero al pasar del último: no hay final, como en
  // TikTok. Sin esto, quien llega abajo se queda mirando una pantalla que
  // ya no responde al gesto.
  enBucle: true,
};

export const CURSOS_GRATIS = {
  titulo: 'Cursos gratis',
  subtitulo: 'Empieza por aquí, sin costo.',
  // Cuántas tarjetas pinta. El diseño trae tres huecos.
  cuantos: 3,
  medidaFoto: { css: '384 × 288', min: '768 × 576' },
};

export const SOBRE_LOS_CURSOS = {
  eyebrow: 'Sobre los cursos',
  titulo: 'Cursos en línea,',
  tituloSegundaLinea: 'a tu ritmo.',
  texto:
    'Cada curso lo prepara un docente desde su propia especialidad. Estudias '
    + 'en línea, cuando tú decides, empezando por los cursos gratuitos.',
  cta: { texto: 'Empieza gratis', a: '/login' },
  foto: { src: '/landing/apoyo.jpg', min: '1440 × 1160', alt: '' },
};

export const AREAS = {
  titulo: 'Áreas de salud',
  subtitulo: 'Lo que puedes aprender en Academy360.',
  /**
   * De dónde salen las tarjetas.
   *
   * `academias-con-vitrina`: se leen de `GET /api/sections/` y solo aparecen
   * las que tienen `allow_public_preview`. Corporativo CAMSA es onboarding
   * interno de empleados y hoy NO tiene vitrina, así que no se anuncia en una
   * página pública. Si algún día se le activa, entra sola.
   *
   * `fijas`: se usa la lista de abajo y no se consulta nada.
   */
  origen: 'academias-con-vitrina',
  fijas: [
    { nombre: 'Nutrición', texto: 'Qué aprende el alumno en esta área.' },
    { nombre: 'Longevidad', texto: 'Qué aprende el alumno en esta área.' },
    { nombre: 'Salud cerebral', texto: 'Qué aprende el alumno en esta área.' },
  ],
};

export const DOCENTES = {
  titulo: 'Docentes',
  subtitulo: 'Especialistas que enseñan desde su práctica.',
  medidaFoto: { css: '276 × 345', min: '552 × 690' },
  /**
   * Estáticos a propósito: no existe endpoint público de instructores, y
   * `Profile` no tiene campo de especialidad. Ponerlos aquí es lo honesto
   * hasta que el backend lo soporte.
   */
  lista: [
    { nombre: '[Nombre del docente]', especialidad: '[Especialidad]', foto: '/landing/docente-1.jpg' },
    { nombre: '[Nombre del docente]', especialidad: '[Especialidad]', foto: '/landing/docente-2.jpg' },
    { nombre: '[Nombre del docente]', especialidad: '[Especialidad]', foto: '/landing/docente-3.jpg' },
    { nombre: '[Nombre del docente]', especialidad: '[Especialidad]', foto: '/landing/docente-4.jpg' },
  ],
};

export const CIERRE = {
  titulo: 'Tu primer curso es gratis.',
  texto: 'Crea tu cuenta y entra hoy a los cursos gratuitos.',
  ctaPrincipal: { texto: 'Empieza gratis', a: '/login' },
  ctaSecundario: { texto: 'Iniciar sesión', a: '/login' },
  foto: { src: '/landing/cierre.jpg', min: '2880 × 798', alt: '' },
};

export const PIE = [
  { texto: 'Academias', a: '#academias' },
  { texto: 'Docentes', a: '#docentes' },
  // Pendiente: hay datos personales de alumnos y pagos con Stripe, y la
  // consulta legal del proyecto sigue en `pendiente`. Un enlace de privacidad
  // que no lleva a ninguna parte es peor que no ponerlo, así que hasta que
  // exista la página, este enlace no se pinta.
  { texto: 'Aviso de privacidad', a: null },
  { texto: 'Iniciar sesión', a: '/login' },
];
