import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import { MARCA, NAVEGACION } from '../academy360Config';
import { Boton } from './Piezas';
import { canal } from './estilos';

/**
 * Cabecera de la landing.
 *
 * El diseño solo trae la versión de escritorio con los tres enlaces a la
 * vista. Por debajo de `lg` no caben, así que se pliegan en un menú: es la
 * decisión que el diseño no tomó y alguien tenía que tomar.
 */
const Encabezado = () => {
  const [abierto, setAbierto] = useState(false);

  // Con el menú abierto no debe correr la página de fondo.
  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [abierto]);

  return (
    <header
      className={`relative z-40 flex h-[72px] items-center justify-between bg-white lg:h-[104px] ${canal}`}
    >
      <Link to="/" className="flex items-center" aria-label={`${MARCA.nombre}, ir al inicio`}>
        <img src={MARCA.logo} alt={MARCA.nombre} className="h-14 w-14 lg:h-[88px] lg:w-[88px]" />
      </Link>

      <nav className="hidden items-center gap-10 lg:flex" aria-label="Principal">
        {NAVEGACION.map((enlace) => (
          <a
            key={enlace.a}
            href={enlace.a}
            className="font-ui text-a-15 tracking-[0.04em] text-academy-tinta-2 underline-offset-8 transition-colors hover:text-academy-tinta hover:underline hover:decoration-academy-oro hover:decoration-2"
          >
            {enlace.texto}
          </a>
        ))}
        <Boton a="/login" variante="contorno" className="h-11 px-6">Iniciar sesión</Boton>
      </nav>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-[4px] text-academy-tinta lg:hidden"
        aria-expanded={abierto}
        aria-controls="menu-landing"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        {abierto ? <X size={22} /> : <Menu size={22} />}
      </button>

      {abierto && (
        <div
          id="menu-landing"
          className={`absolute inset-x-0 top-full flex flex-col gap-1 border-t border-academy-linea bg-white py-4 lg:hidden ${canal}`}
        >
          {NAVEGACION.map((enlace) => (
            <a
              key={enlace.a}
              href={enlace.a}
              onClick={() => setAbierto(false)}
              className="flex h-12 items-center font-ui text-a-17 text-academy-tinta-2"
            >
              {enlace.texto}
            </a>
          ))}
          <Boton a="/login" variante="contorno" className="mt-2 w-full">Iniciar sesión</Boton>
        </div>
      )}
    </header>
  );
};

export default Encabezado;
