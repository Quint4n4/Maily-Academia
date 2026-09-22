import { useState } from 'react';
import { Play } from 'lucide-react';

import { ACADEMIAS } from '../academy360Config';
import PanelDeAcademia from './PanelDeAcademia';
import { Foto, TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Las tres academias. Al pulsar una se abre su panel a pantalla completa.
 *
 * Sustituye a la sección de cursos gratuitos: contar las academias explica
 * mejor qué es Academy360 que enseñar tres cursos sueltos, y de paso el
 * catálogo deja de depender de que haya cursos gratis publicados.
 */
const Academias = () => {
  const [abierta, setAbierta] = useState(null);

  return (
    <section id="academias" className={`bg-white py-16 lg:py-[112px] ${canal}`}>
      <TituloDeSeccion titulo={ACADEMIAS.titulo} subtitulo={ACADEMIAS.subtitulo} />

      <div className="mx-auto grid max-w-[1200px] gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {ACADEMIAS.lista.map((academia) => (
          <article key={academia.slug} className="flex flex-col">
            {/* Es un botón y no un div con onClick: así funciona con teclado y
                un lector de pantalla anuncia que abre algo. */}
            <button
              type="button"
              onClick={() => setAbierta(academia)}
              className="group relative block aspect-[4/3] w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto focus-visible:ring-offset-2"
              aria-label={`Ver ${academia.nombre}`}
            >
              <Foto
                src={academia.imagen}
                alt=""
                min={ACADEMIAS.medidaFoto.min}
                etiqueta={`Portada de ${academia.nombre}`}
                className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span
                className="absolute inset-0 flex items-center justify-center bg-academy-tinta/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden="true"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90">
                  <Play size={22} className="ml-1 text-academy-tinta" />
                </span>
              </span>
            </button>

            <h3 className="mt-5 font-display text-a-25 text-academy-tinta lg:text-a-27">
              {academia.nombre}
            </h3>
            <p className="mt-2 font-ui text-a-15 leading-[1.6] text-academy-tinta-3">
              {academia.resumen}
            </p>
          </article>
        ))}
      </div>

      {abierta && (
        <PanelDeAcademia academia={abierta} onCerrar={() => setAbierta(null)} />
      )}
    </section>
  );
};

export default Academias;
