import { useEffect, useState } from 'react';

import { HERO, HERO_FOTOS, MARCA } from '../academy360Config';
import { Boton, Eyebrow, Foto } from './Piezas';
import { canal } from './estilos';

const CADA = 6000;

/**
 * Hero con carrusel automático.
 *
 * Sin controles a propósito: las fotos son ambientales, no contenido que
 * alguien necesite recorrer. Unas flechas invitarían a interactuar con algo
 * que no lleva a ninguna parte, y unos puntos sugerirían que hay que verlas
 * todas.
 *
 * Sin librería: es un cross-fade de opacidad cada seis segundos. Meter swiper
 * o embla por esto serían ~40 KB para lo que resuelven diez líneas.
 *
 * Se detiene si el sistema pide menos movimiento: una imagen que cambia sola
 * puede marear o distraer a quien lo tiene activado, y no se pierde nada
 * porque siempre queda una foto en pantalla.
 */
const Hero = () => {
  const fotos = HERO_FOTOS.length ? HERO_FOTOS : [{ src: null, min: '1440 px de alto' }];
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (fotos.length < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    const reloj = setInterval(() => setActual((i) => (i + 1) % fotos.length), CADA);
    return () => clearInterval(reloj);
  }, [fotos.length]);

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Fotos: en escritorio ocupan la mitad derecha con una máscara que las
          difumina hacia el texto; en móvil van arriba, a lo ancho. */}
      <div className="relative h-[280px] w-full sm:h-[360px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-full lg:w-[58%]">
        {fotos.map((foto, indice) => (
          <div
            key={foto.src ?? indice}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: indice === actual ? 1 : 0 }}
            aria-hidden="true"
          >
            <Foto
              src={foto.src}
              alt=""
              min={foto.min}
              etiqueta="Foto del hero"
              className="h-full w-full lg:[mask-image:linear-gradient(90deg,transparent_0%,black_22%)]"
            />
          </div>
        ))}
      </div>

      <div className={`relative ${canal} py-12 lg:min-h-[720px] lg:py-0`}>
        <div className="flex h-full max-w-[700px] flex-col justify-center lg:min-h-[720px]">
          {/* El logo vive aqui y no en la cabecera: puesto arriba del todo
              quedaba pequeno y lejos del mensaje. Aqui abre la columna y se
              lee como parte de lo que se esta diciendo. */}
          <img
            src={MARCA.logo}
            alt={MARCA.nombre}
            className="mx-auto mb-8 h-[120px] w-[120px] lg:h-[150px] lg:w-[150px]"
          />

          <Eyebrow>{HERO.eyebrow}</Eyebrow>

          <h1 className="mt-6 font-display text-[40px] leading-[1.06] tracking-[-0.01em] text-academy-tinta sm:text-a-54 lg:text-a-76">
            {HERO.titulo}{' '}
            {/* Sin cursiva: Outfit no la tiene y el navegador la fabricaria
                inclinando las letras, lo que en una geometrica se nota. La
                segunda mitad se distingue por el color. */}
            <span className="text-academy-oro-texto">{HERO.tituloDestacado}</span>
          </h1>

          <p className="mt-6 max-w-[520px] font-ui text-a-17 leading-[1.7] text-academy-tinta-2">
            {HERO.texto}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Boton a={HERO.ctaPrincipal.a}>{HERO.ctaPrincipal.texto}</Boton>
            <Boton a={HERO.ctaSecundario.a} variante="contorno">{HERO.ctaSecundario.texto}</Boton>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
