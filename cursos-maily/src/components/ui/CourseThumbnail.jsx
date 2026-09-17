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
 *
 * `width` es un prop y no algo que se pase por `className` por una razon
 * concreta: el ancho estaba fijado aqui como `w-full`, y un `w-16` que llegara
 * por `className` NO lo sobrescribia. En Tailwind, entre dos utilidades del
 * mismo grupo con la misma especificidad gana la que va despues en la HOJA, no
 * en el atributo `class`, y `.w-full` se genera despues de `.w-16`. El gestor de
 * cursos pedia una miniatura de 64px y recibia una que ocupaba media fila, con
 * la imagen aplastada a una franja. Quien quiera otro ancho lo pide por aqui.
 */
export const CourseThumbnail = ({
  src,
  alt = '',
  className = '',
  aspect = 'aspect-video',
  width = 'w-full',
}) => {
  const [falloAlCargar, setFalloAlCargar] = useState(false);
  const hayImagen = typeof src === 'string' && src.trim() !== '' && !falloAlCargar;

  if (!hayImagen) {
    return (
      <div
        className={`${aspect} ${width} shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
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
      className={`${aspect} ${width} shrink-0 object-cover ${className}`}
    />
  );
};

export default CourseThumbnail;
