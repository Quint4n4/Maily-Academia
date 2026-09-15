import { useState } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * Imagen de un curso, con dos problemas resueltos que se repetian en cada uso:
 *
 * 1. `Course.thumbnail` tiene `default=''` en el backend, y `<img src="">` hace
 *    que el navegador vuelva a pedir la pagina entera. React avisa de esto en
 *    consola una vez por tarjeta.
 * 2. Sin relacion de aspecto fija, una imagen vertical salia con bandas negras
 *    a los lados y una panoramica deformaba la maqueta.
 *
 * Ver docs/07-auditoria-frontend.md, F9 y F12.
 */
export const CourseThumbnail = ({
  src,
  alt = '',
  className = '',
  aspect = 'aspect-video',
}) => {
  const [falloAlCargar, setFalloAlCargar] = useState(false);
  const hayImagen = typeof src === 'string' && src.trim() !== '' && !falloAlCargar;

  if (!hayImagen) {
    return (
      <div
        className={`${aspect} w-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
        // decorativo: el titulo del curso ya esta al lado, repetirlo es ruido
        aria-hidden="true"
      >
        <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalloAlCargar(true)}
      className={`${aspect} w-full object-cover ${className}`}
    />
  );
};

export default CourseThumbnail;
