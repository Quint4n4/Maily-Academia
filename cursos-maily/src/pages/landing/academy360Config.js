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
 * vertical y texto encima-- con su feed de videos, su descripción y un botón.
 *
 * Los logos viven en `public/academias/`, ya reescalados: los originales venían
 * a 2897 y 4451 px de ancho para verse a 200, y una imagen de seis megapíxeles
 * ocupa ~23 MB de memoria descomprimida aunque pese 100 KB en disco.
 *
 * Los tres tienen proporciones que no se parecen en nada --Maily es vertical,
 * Longevity 360 es casi seis veces más ancho que alto-- así que se dibujan con
 * `object-contain` dentro de una caja común y nunca con alto o ancho fijos.
 */
export const ACADEMIAS = {
  titulo: 'Nuestras academias',
  subtitulo: 'Tres caminos, según lo que necesites aprender.',
  lista: [
    {
      slug: 'maily-academia',
      videos: videosDe('maily'),
      nombre: 'Maily',
      logo: '/academias/logo-maily.png',
      resumen: 'Aprende a manejar nuestro software.',
      imagen: '/academias/maily.jpg',
      video: '/academias/maily.mp4',
      descripcion:
        'La academia de Maily está dedicada a que domines el software: '
        + 'desde lo básico hasta lo que casi nadie usa. Cursos cortos, '
        + 'hechos por quienes lo construyeron.',
      cta: { texto: 'Conocer más', a: 'https://maily.mx/', externo: true },
    },
    {
      slug: 'longevity-360',
      videos: videosDe('longevity'),
      nombre: 'Longevity 360',
      logo: '/academias/logo-longevity.png',
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
      logo: '/academias/logo-camsa.png',
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

/**
 * El mosaico de curiosidades.
 *
 * Doce cuadros iguales que caben de una vez en una pantalla de escritorio. Al
 * pasar el cursor por uno, se adelanta y enseña el video sin sonido; al
 * pulsarlo se abre a pantalla grande, en horizontal y con sonido.
 *
 * Cada pieza lleva DOS textos y no uno. En un cuadro de 180 px no cabe una
 * frase entera sin convertirse en un párrafo diminuto, así que ahí va el
 * `gancho` --tres o cuatro palabras que se leen de un vistazo-- y el `dato`
 * completo espera dentro del panel, que es donde hay sitio para leerlo.
 *
 * LOS TEXTOS SON DE EJEMPLO. Son datos ciertos y de manual, puestos para poder
 * ver la sección funcionando, pero esto es una plataforma de salud: cada
 * afirmación que se publique aquí debería poder respaldarse. Sustitúyelos por
 * los de los docentes.
 */
export const CUERPO = {
  eyebrow: 'Curiosidades',
  titulo: '¿Sabías esto de tu cuerpo?',
  subtitulo: 'Pasa el cursor por encima y pulsa para verlo en grande.',
  subtituloTactil: 'Toca cualquiera y te lo contamos en un minuto.',
  medidaFoto: { css: '180 × 180', min: '1280 × 720' },
  medidaVideo: { css: '16:9 horizontal', min: '1280 × 720' },
  /**
   * Milisegundos que espera antes de arrancar el video del cuadro.
   *
   * No es un capricho: sin esta pausa, cruzar el mosaico con el ratón lanza la
   * descarga de las doce piezas que toca de paso. Con ella solo se descarga
   * aquella en la que alguien se detiene.
   */
  esperaAntesDeArrancar: 140,
  piezas: [
    { slug: 'intestino', gancho: '500 millones de neuronas', dato: 'Tu intestino tiene unos 500 millones de neuronas propias.' },
    { slug: 'corazon', gancho: '100 000 latidos al día', dato: 'El corazón late unas 100 000 veces al día.' },
    { slug: 'cerebro', gancho: 'El 2 % de ti, el 20 % de tu energía', dato: 'El cerebro pesa el 2 % de ti y gasta el 20 % de tu energía.' },
    { slug: 'huesos', gancho: 'Un esqueleto nuevo cada década', dato: 'El esqueleto se renueva por completo cada diez años.' },
    { slug: 'piel', gancho: 'Piel nueva cada mes', dato: 'La capa externa de la piel se renueva cada mes.' },
    { slug: 'higado', gancho: 'El órgano que se regenera', dato: 'El hígado es el único órgano que regenera lo que le falta.' },
    { slug: 'microbiota', gancho: 'Tantas bacterias como células', dato: 'Llevas encima tantas bacterias como células propias.' },
    { slug: 'pulmones', gancho: '70 m² plegados en el pecho', dato: 'Desplegados, los pulmones cubrirían unos 70 m².' },
    { slug: 'saliva', gancho: 'Un litro de saliva al día', dato: 'Produces más de un litro de saliva al día.' },
    { slug: 'estomago', gancho: 'Se rehace cada pocos días', dato: 'El estómago rehace su recubrimiento cada pocos días.' },
    { slug: 'ojos', gancho: '15 parpadeos por minuto', dato: 'Parpadeas unas 15 veces por minuto sin darte cuenta.' },
    { slug: 'sangre', gancho: 'La vuelta al cuerpo en un minuto', dato: 'Tu sangre da la vuelta al cuerpo entero en un minuto.' },
  ],
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
