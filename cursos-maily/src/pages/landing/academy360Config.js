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

/**
 * El hero.
 *
 * "Empieza gratis" se queda, pero ahora dice QUÉ es lo gratis. Una promesa
 * gratuita sin límite declarado se lee como "todo es gratis", y el día que
 * aparezca un precio parece un cambio de reglas.
 *
 * OJO con lo que se promete aquí: hoy el backend cobra por curso entero
 * --`Course.price`--, y ni `Module` ni `Lesson` tienen campo para marcarse
 * como gratuitos. O sea que un curso es gratis del todo o de pago del todo.
 * El texto dice "cursos abiertos sin costo", que es exactamente eso. En cuanto
 * el backend sepa abrir el primer módulo de un curso de pago, esta línea se
 * cambia por "el primer módulo de cada curso".
 */
export const HERO = {
  eyebrow: 'Cursos de salud en línea',
  // Invita en vez de argumentar, y engancha con la sección "¿Sabías esto de
  // tu cuerpo?": una portada que repite una idea se lee como una sola cosa en
  // vez de como cinco bloques sueltos.
  //
  // Lo que este titular NO dice es quién enseña, que es el activo real del
  // proyecto. Ese peso lo llevan ahora el eyebrow y el párrafo de debajo, y
  // por eso el párrafo abre con los especialistas y no con las áreas.
  titulo: 'Tu cuerpo tiene mucho que contarte.',
  tituloDestacado: 'Aprende a escucharlo.',
  texto:
    'Especialistas que atienden pacientes te explican nutrición, longevidad, '
    + 'salud cerebral y medicina preventiva. Hay cursos abiertos sin costo '
    + 'para que veas cómo enseñan antes de pagar nada.',
  // A `/registro` y no a `/login`: quien pulsa "Empieza gratis" no tiene
  // cuenta, y mandarlo a un formulario que pide contraseña es perderlo.
  ctaPrincipal: { texto: 'Empieza gratis', a: '/registro' },
  ctaSecundario: { texto: 'Ver las academias', a: '#academias' },
};

/**
 * El menú.
 *
 * "Áreas" apuntaba a `#areas`, que ya no existe: esa sección la sustituyó la
 * invitación a Longevity 360. Un ancla que no lleva a ninguna parte no da
 * error, simplemente no hace nada, y eso se descubre pulsándola.
 */
export const NAVEGACION = [
  { texto: 'Academias', a: '#academias' },
  { texto: 'Tu cuerpo', a: '#cuerpo' },
  { texto: 'Longevity 360', a: '#longevity' },
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
  // Dice de entrada cuál es la que se puede comprar. Dos de las tres son
  // cerradas --clientes del software y empleados-- y antes no lo decían: un
  // visitante podía gastar su único clic en una puerta que no es suya.
  subtitulo: 'Longevity 360 está abierta a cualquiera. Las otras dos ya tienen dueño.',
  lista: [
    {
      slug: 'maily-academia',
      videos: videosDe('maily'),
      nombre: 'Maily',
      logo: '/academias/logo-maily.png',
      resumen: 'Cerrada. Solo para quien usa el software Maily.',
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
      resumen: 'Abierta a cualquiera. Aquí están los cursos que se venden.',
      imagen: '/academias/longevity.jpg',
      video: '/academias/longevity.mp4',
      descripcion:
        'Nuestra academia abierta. Nutrición, longevidad, salud cerebral y '
        + 'medicina preventiva, impartidos por especialistas que atienden '
        + 'pacientes. Entra a los cursos abiertos y decide desde dentro.',
      cta: { texto: 'Crear mi cuenta', a: '/registro' },
    },
    {
      slug: 'corporativo-camsa',
      videos: videosDe('camsa'),
      nombre: 'Corporativo CAMSA',
      logo: '/academias/logo-camsa.png',
      resumen: 'Cerrada. Formación interna del equipo CAMSA.',
      imagen: '/academias/camsa.jpg',
      video: '/academias/camsa.mp4',
      // Ya no abre preguntando "¿eres parte de nuestra familia?". Esa pregunta
      // la respondía que no casi todo el que la leía, y responder que no a la
      // primera frase de una tarjeta es que te digan que esto no es para ti.
      descripcion:
        'Formación interna para el equipo de Corporativo CAMSA: lo que hace '
        + 'falta saber en cada área, actualizado. Si trabajas aquí, entra con '
        + 'tu cuenta de siempre.',
      // Este SÍ se queda en `/login`: quien entra aquí ya tiene cuenta de
      // empresa. Es el único de los cinco botones que estaba bien.
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
  // El subtítulo ya no explica cómo se usa el ratón. Ese espacio es de los
  // pocos sitios donde se puede decir algo que importe, y gastarlo en
  // instrucciones de interfaz sale caro: el que pasa el cursor lo descubre
  // solo, y el que no, no iba a leerlo.
  subtitulo: 'Doce cosas que están pasando dentro de ti ahora mismo.',
  subtituloTactil: 'Doce cosas que están pasando dentro de ti ahora mismo.',
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
  /**
   * El gancho abre y el dato cierra a medias.
   *
   * Antes los dos decían lo mismo: "15 parpadeos por minuto" y "parpadeas
   * unas 15 veces por minuto". Un dato cerrado se lee, se asiente y se cierra
   * la pestaña. Ahora el cuadro plantea algo y el panel lo explica, que es la
   * única razón por la que alguien pulsaría.
   *
   * Ninguno termina en "esto lo explica el curso de X": esos cursos todavía no
   * existen y nombrarlos sería prometer un catálogo que no hay. Cuando estén
   * publicados, esta es la frase que cada dato debe ganar al final.
   */
  piezas: [
    { slug: 'intestino', gancho: 'Tu intestino también piensa', dato: 'Tu intestino tiene unos 500 millones de neuronas propias y habla con el cerebro todo el día.' },
    { slug: 'corazon', gancho: '100 000 latidos antes de mañana', dato: 'Tu corazón latirá unas 100 000 veces en las próximas 24 horas, y de cómo lo trates depende cuánto le cuesta cada uno.' },
    { slug: 'cerebro', gancho: 'El 2 % de ti se lleva el 20 %', dato: 'El cerebro pesa el 2 % de tu cuerpo y consume cerca del 20 % de tu energía en reposo.' },
    { slug: 'huesos', gancho: 'No es el esqueleto de hace diez años', dato: 'El hueso se deshace y se rehace sin parar; en torno a una década, el esqueleto es tejido nuevo.' },
    { slug: 'piel', gancho: 'Tu piel se rehace este mes', dato: 'La capa externa de la piel se renueva por completo en unas cuatro semanas.' },
    { slug: 'higado', gancho: 'Vuelve a crecer, pero tiene límite', dato: 'El hígado puede regenerar buena parte del tejido que pierde, mucho más que cualquier otro órgano.' },
    { slug: 'microbiota', gancho: 'No vives solo ahí dentro', dato: 'Llevas encima aproximadamente tantas bacterias como células propias, y comen de lo que tú comes.' },
    { slug: 'pulmones', gancho: '70 m² plegados en tu pecho', dato: 'Desplegada, la superficie de tus pulmones cubriría una sala entera.' },
    { slug: 'musculo', gancho: 'Se va sin avisar', dato: 'A partir de cierta edad el músculo se pierde si nadie lo usa, y es el tejido que más sostiene la autonomía.' },
    { slug: 'estomago', gancho: 'Se rehace cada pocos días', dato: 'El estómago rehace su recubrimiento cada pocos días, porque lo que contiene lo disolvería.' },
    { slug: 'sueno', gancho: 'Un tercio de tu vida', dato: 'Vas a pasar alrededor de un tercio de tu vida durmiendo, y es cuando el cuerpo hace su mantenimiento.' },
    { slug: 'sangre', gancho: 'La vuelta entera en un minuto', dato: 'Tu sangre recorre el cuerpo completo en aproximadamente un minuto, llevando todo lo que comiste hoy.' },
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

/**
 * La invitación a Longevity 360.
 *
 * Sustituye a "Áreas de salud", que enumeraba las academias con vitrina y
 * acabó diciendo lo mismo que "Nuestras academias" tres secciones más arriba.
 *
 * Va sobre fondo oscuro y no sobre blanco como el resto: es la cuarta sección
 * clara seguida y, sin un corte, la portada se leía como una sola mancha. De
 * paso el dorado del logo es lo que mejor funciona sobre la tinta.
 *
 * El logo tiene su propio archivo a 1600 px. El de las tarjetas de academias
 * mide 900 y aquí se dibuja a 760, que en una pantalla de alta densidad son
 * 1520 físicos: se vería blando justo en el elemento más grande de la página.
 */
export const LONGEVITY = {
  titulo: 'Conoce más sobre tu cuerpo',
  tituloSegundaLinea: 'con nuestros cursos en',
  logo: '/academias/logo-longevity-grande.png',
  nombre: 'Longevity 360',
  // Esta sección es lo único de la portada que nombra lo que el alumno se
  // lleva. El diploma existe de verdad --lo emite `apps/certificates`-- y es
  // de Academy360: NO es un título oficial ni está avalado por ninguna
  // autoridad educativa, así que no puede llamarse "certificación" a secas.
  texto:
    'Cursos en línea que preparan especialistas que atienden pacientes. '
    + 'Estudias a tu ritmo y al terminar cada uno recibes tu diploma de '
    + 'Academy360.',
  cta: { texto: 'Entrar a Longevity 360', a: '/registro' },
};

/**
 * Docentes, en carrusel.
 *
 * Una tarjeta al frente, nítida y a tamaño completo, y las vecinas detrás,
 * encogidas y desenfocadas. El desenfoque no es adorno: con tres videos
 * verticales a la vista, algo tiene que decir cuál se está mirando, y
 * encogerlas sin más no basta.
 *
 * Los archivos se derivan del `slug`: `/docentes/<slug>.mp4` y `.jpg`.
 *
 * Siguen siendo estáticos a propósito: no existe endpoint público de
 * instructores, y `Profile` no tiene campo de especialidad. Ponerlos aquí es
 * lo honesto hasta que el backend lo soporte.
 */
export const DOCENTES = {
  titulo: 'Docentes',
  subtitulo: 'Especialistas que enseñan desde su práctica.',
  medidaVideo: { css: '9:16 vertical', min: '720 × 1280' },
  medidaFoto: { css: '9:16 vertical', min: '720 × 1280' },
  lista: [
    { slug: 'docente-1', nombre: '[Nombre del docente]', especialidad: '[Especialidad]' },
    { slug: 'docente-2', nombre: '[Nombre del docente]', especialidad: '[Especialidad]' },
    { slug: 'docente-3', nombre: '[Nombre del docente]', especialidad: '[Especialidad]' },
    { slug: 'docente-4', nombre: '[Nombre del docente]', especialidad: '[Especialidad]' },
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
