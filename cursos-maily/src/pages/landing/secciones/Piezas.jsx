import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Piezas compartidas de la landing de Academy360.
 *
 * Sobre el modo oscuro: el diseño original no lo trae, y su gracia es la crema
 * sobre blanco. Aquí se resuelve invirtiendo -- la tinta pasa a fondo y las
 * cremas a texto -- y dejando el dorado intacto, que es lo único que funciona
 * igual en los dos temas.
 *
 * No se repite el intento del 2026-09-03 de aclarar la paleta para oscuro, que
 * empeoró el contraste y hubo que revertir (ver src/index.css).
 */

/**
 * Foto con marcador.
 *
 * Mientras el archivo no exista, pinta un hueco con las medidas que hacen
 * falta. Es deliberado: un `img` roto no dice qué foto falta ni de qué tamaño,
 * y estas trece hay que conseguirlas una a una.
 */
export const Foto = ({ src, alt = '', min, etiqueta, className = '', imgClassName = '' }) => {
  const [falla, setFalla] = useState(!src);

  if (falla) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 bg-academy-crema-2 text-center ${className}`}
        role="img"
        aria-label={alt || etiqueta || 'Imagen pendiente'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.5" className="text-academy-borde" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="1" />
          <path d="m3 15 5-4 4 3 3-2 6 4" />
        </svg>
        {etiqueta && (
          <p className="px-2 font-ui text-[10px] uppercase tracking-[0.14em] text-academy-tinta-3">
            {etiqueta}
          </p>
        )}
        {min && (
          <p className="font-ui text-[10px] text-academy-tinta-3/80">mín. {min}</p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalla(true)}
      className={`h-full w-full object-cover ${imgClassName} ${className}`}
    />
  );
};

/** Texto pequeño en mayúsculas con filete dorado delante. */
export const Eyebrow = ({ children, centrado = false }) => (
  <p className={`flex items-center gap-4 ${centrado ? 'justify-center' : ''}`}>
    <span className="h-px w-8 bg-academy-oro" aria-hidden="true" />
    <span className="font-ui text-a-13 uppercase tracking-[0.18em] text-academy-oro-texto">
      {children}
    </span>
  </p>
);

/** Encabezado centrado con filetes a los lados, como en el diseño. */
export const TituloDeSeccion = ({ titulo, subtitulo }) => (
  <header className="mb-12 text-center lg:mb-16">
    <div className="flex items-center justify-center gap-6">
      <span className="hidden h-px w-16 bg-academy-linea sm:block lg:w-28" aria-hidden="true" />
      <h2 className="font-display text-a-32 text-academy-tinta sm:text-a-44">
        {titulo}
      </h2>
      <span className="hidden h-px w-16 bg-academy-linea sm:block lg:w-28" aria-hidden="true" />
    </div>
    {subtitulo && (
      <p className="mt-3 font-ui text-a-15 text-academy-tinta-3">{subtitulo}</p>
    )}
  </header>
);

const BASE_BOTON =
  'inline-flex h-[52px] items-center justify-center rounded-[4px] px-7 '
  + 'font-ui text-a-15 tracking-[0.04em] transition-[filter,background-color,color] duration-200 '
  + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto focus-visible:ring-offset-2';

/**
 * Botón sólido o contorneado.
 *
 * El contorneado usa `oro-texto` y no `oro` para el borde: el dorado claro
 * sobre blanco da 1.95:1 y WCAG pide 3:1 para el contorno de un control. El
 * dorado claro se queda para rellenos y filetes, que sí están exentos.
 */
export const Boton = ({ a, children, variante = 'solido', className = '' }) => {
  const estilo = variante === 'solido'
    ? 'bg-academy-oro text-academy-sobre-oro hover:brightness-95'
    : 'border border-academy-oro-texto text-academy-tinta hover:bg-academy-oro/10 '
      + '';

  const clases = `${BASE_BOTON} ${estilo} ${className}`;

  if (!a) return <span className={clases}>{children}</span>;
  // Las anclas internas (#cursos) no pasan por el router: `Link` las trataría
  // como una ruta y dejaría la página en blanco.
  if (a.startsWith('#')) return <a href={a} className={clases}>{children}</a>;
  return <Link to={a} className={clases}>{children}</Link>;
};

export default { Foto, Eyebrow, TituloDeSeccion, Boton };
