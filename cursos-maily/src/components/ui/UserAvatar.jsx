import { useState } from 'react';

/**
 * Foto de una persona, con respaldo cuando no hay.
 *
 * Nace de un defecto concreto: sin foto, el avatar caia en ui-avatars.com, un
 * servicio externo que dibuja el nombre. Si esa peticion no llega --sin red,
 * bloqueada por una extension, el servicio caido-- el navegador pinta el texto
 * alternativo, o sea el nombre completo, desparramado dentro del circulo.
 * Ademas mandaba el nombre del usuario a un tercero en cada carga.
 *
 * Aqui el respaldo es local: las iniciales sobre un color estable.
 */

const COLORES = [
  'bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-teal-500', 'bg-indigo-500', 'bg-orange-500',
];

/**
 * Color a partir del texto, no aleatorio: la misma persona sale siempre del
 * mismo color en toda la aplicacion, que es lo que permite reconocerla de un
 * vistazo en una tabla. Con un color al azar, cada render la cambiaria.
 */
const colorPara = (texto = '') => {
  let suma = 0;
  for (let i = 0; i < texto.length; i += 1) suma += texto.charCodeAt(i);
  return COLORES[suma % COLORES.length];
};

const inicialesDe = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || '?';

const TAMANOS = {
  sm: { caja: 'w-9 h-9', texto: 'text-xs' },
  md: { caja: 'w-12 h-12', texto: 'text-sm' },
  lg: { caja: 'w-24 h-24', texto: 'text-2xl' },
};

export const UserAvatar = ({ src, nombre = '', size = 'sm', className = '' }) => {
  const [fallo, setFallo] = useState(false);
  const { caja, texto } = TAMANOS[size] || TAMANOS.sm;

  // Una cadena vacia en `src` hace que el navegador vuelva a pedir la pagina
  // entera, asi que se comprueba el contenido y no solo que exista.
  const hayFoto = typeof src === 'string' && src.trim() !== '' && !fallo;

  if (hayFoto) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFallo(true)}
        className={`${caja} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      // Decorativo: el nombre de la persona siempre esta escrito al lado, asi
      // que leerlo dos veces solo estorba a quien usa lector de pantalla.
      aria-hidden="true"
      className={`${caja} ${texto} ${colorPara(nombre)} rounded-full shrink-0 flex items-center justify-center text-white font-bold select-none ${className}`}
    >
      {inicialesDe(nombre)}
    </div>
  );
};

export default UserAvatar;
