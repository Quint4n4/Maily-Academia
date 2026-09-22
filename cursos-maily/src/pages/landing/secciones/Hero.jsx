import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { HERO, HERO_FOTOS } from '../academy360Config';
import { Boton, Eyebrow, Foto } from './Piezas';
import { canal } from './estilos';

const CADA = 6000;

/**
 * Hero con carrusel.
 *
 * Sin librería a propósito: el carrusel del diseño es un cross-fade de
 * opacidad cada seis segundos. Meter swiper o embla por esto serían ~40 KB
 * para lo que resuelven quince líneas.
 *
 * Los controles solo aparecen con más de una foto, como en el diseño, y el
 * avance automático se detiene si el sistema pide menos movimiento
 * (`prefers-reduced-motion`) o si el usuario ya tomó el control.
 */
const Hero = () => {
  const fotos = HERO_FOTOS.length ? HERO_FOTOS : [{ src: null, min: '1440 px de alto' }];
  const [actual, setActual] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (fotos.length < 2 || manual) return undefined;
    const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (menosMovimiento) return undefined;

    const reloj = setInterval(() => setActual((i) => (i + 1) % fotos.length), CADA);
    return () => clearInterval(reloj);
  }, [fotos.length, manual]);

  const ir = (indice) => {
    setManual(true);
    setActual((indice + fotos.length) % fotos.length);
  };

  return (
    <section className="relative overflow-hidden bg-white dark:bg-academy-tinta">
      {/* Fotos: en escritorio ocupan la mitad derecha con una máscara que las
          difumina hacia el texto; en móvil van arriba, a lo ancho. */}
      <div className="relative h-[280px] w-full sm:h-[360px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%]">
        {fotos.map((foto, indice) => (
          <div
            key={foto.src ?? indice}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: indice === actual ? 1 : 0 }}
            aria-hidden={indice !== actual}
          >
            <Foto
              src={foto.src}
              alt={foto.alt ?? ''}
              min={foto.min}
              etiqueta="Foto del hero"
              className="h-full w-full lg:[mask-image:linear-gradient(90deg,transparent_0%,black_22%)]"
            />
          </div>
        ))}
      </div>

      <div className={`relative ${canal} py-12 lg:min-h-[720px] lg:py-0`}>
        <div className="flex h-full max-w-[700px] flex-col justify-center lg:min-h-[720px]">
          <Eyebrow>{HERO.eyebrow}</Eyebrow>

          <h1 className="mt-6 font-display text-[40px] leading-[1.06] tracking-[-0.01em] text-academy-tinta sm:text-a-54 lg:text-a-76 dark:text-academy-crema">
            {HERO.titulo}{' '}
            <em className="not-italic">
              <span className="italic text-academy-oro-texto dark:text-academy-oro">
                {HERO.tituloDestacado}
              </span>
            </em>
          </h1>

          <p className="mt-6 max-w-[520px] font-ui text-a-17 leading-[1.7] text-academy-tinta-2 dark:text-white/70">
            {HERO.texto}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Boton a={HERO.ctaPrincipal.a}>{HERO.ctaPrincipal.texto}</Boton>
            <Boton a={HERO.ctaSecundario.a} variante="contorno">{HERO.ctaSecundario.texto}</Boton>
          </div>
        </div>

        {fotos.length > 1 && (
          <div className="mt-10 flex items-center gap-4 lg:absolute lg:bottom-10 lg:right-[120px] lg:mt-0">
            <button
              type="button" onClick={() => ir(actual - 1)} aria-label="Foto anterior"
              className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-academy-oro-texto text-academy-tinta transition-colors hover:bg-academy-oro/10 dark:text-academy-crema"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button" onClick={() => ir(actual + 1)} aria-label="Foto siguiente"
              className="flex h-12 w-12 items-center justify-center rounded-[4px] border border-academy-oro-texto text-academy-tinta transition-colors hover:bg-academy-oro/10 dark:text-academy-crema"
            >
              <ChevronRight size={20} />
            </button>
            <div className="flex gap-2" role="tablist" aria-label="Fotos del encabezado">
              {fotos.map((foto, indice) => (
                <button
                  key={foto.src ?? indice}
                  type="button"
                  role="tab"
                  aria-selected={indice === actual}
                  aria-label={`Foto ${indice + 1}`}
                  onClick={() => ir(indice)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    indice === actual ? 'bg-academy-oro-texto' : 'bg-academy-linea'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
