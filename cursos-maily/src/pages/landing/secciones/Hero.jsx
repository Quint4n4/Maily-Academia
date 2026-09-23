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
      {/* Fotos: en pantallas anchas ocupan la mitad derecha con una máscara
          que las difumina hacia el texto; hasta ahí van arriba, a lo ancho.
          
          El corte es `xl` (1280) y no `lg` (1024). Entre esos dos anchos la
          foto ocupaba el 58 % y al texto le quedaban 310 px útiles: el titular
          se metía 372 px sobre la parte opaca de la foto y se leía negro sobre
          fotografía. Medido, no estimado. */}
      <div className="relative h-[280px] w-full sm:h-[360px] xl:absolute xl:inset-y-0 xl:right-0 xl:h-full xl:w-[58%]">
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
              className="h-full w-full xl:[mask-image:linear-gradient(90deg,transparent_0%,black_22%)]"
            />
          </div>
        ))}
      </div>

      <div className={`relative ${canal} py-12 xl:min-h-[720px] xl:py-0`}>
        {/* El ancho del texto se frena donde empieza la zona opaca de la foto:
            560 px a 1280 y 680 desde 1536, que es cuando vuelve a haber sitio. */}
        <div className="flex h-full max-w-[700px] flex-col justify-center xl:min-h-[720px] xl:max-w-[560px] 2xl:max-w-[680px]">
          {/* El logo vive aqui y no en la cabecera: puesto arriba del todo
              quedaba pequeno y lejos del mensaje. Aqui abre la columna y se
              lee como parte de lo que se esta diciendo.

              Logo y eyebrow van en un contenedor que se encoge a su contenido
              (`self-start`), asi que su ancho lo marca el eyebrow, que es el
              mas largo. `items-center` centra el logo sobre ESE ancho, no
              sobre la columna entera. Si el texto cambia, el logo se recoloca
              solo. */}
          <div className="mb-2 flex flex-col items-center self-start">
            <img
              src={MARCA.logo}
              alt={MARCA.nombre}
              className="mb-8 h-[120px] w-[120px] lg:h-[150px] lg:w-[150px]"
            />
            <Eyebrow>{HERO.eyebrow}</Eyebrow>
          </div>

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
