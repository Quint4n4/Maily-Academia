import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';

import { CUERPO } from '../academy360Config';
import PanelDeCuriosidad from './PanelDeCuriosidad';
import { Eyebrow } from './Piezas';
import { canal } from './estilos';

/**
 * Mosaico de curiosidades del cuerpo.
 *
 * Doce cuadros del mismo tamaño, pensados para entrar de una vez en una
 * pantalla de escritorio. Al pasar el cursor por uno se adelanta y enseña el
 * video sin sonido; al pulsarlo se abre en grande y en horizontal.
 *
 * Cuatro decisiones que no se ven pero sostienen esto:
 *
 * - **En un móvil no hay cursor.** La mitad de quien entre no puede "pasar por
 *   encima" de nada. Se detecta con `(hover: hover)` --no con el ancho de la
 *   pantalla, que miente en tabletas y portátiles táctiles-- y ahí el toque va
 *   directo al panel grande, sin previsualización de por medio.
 * - **El cuadro crece con `scale`, no cambiando de tamaño.** Si creciera de
 *   verdad empujaría a sus vecinos y el mosaico entero bailaría cada vez que
 *   alguien mueve el ratón.
 * - **El video no arranca al instante.** Cruzar el mosaico de lado a lado pasa
 *   por encima de seis cuadros, y sin una pausa previa eso son seis descargas
 *   que nadie pidió.
 * - **La previsualización va muda a la fuerza.** Ningún navegador deja sonar
 *   un video que empieza solo. El sonido vive en el panel, que se abre con un
 *   clic y por tanto sí lo tiene permitido.
 */
const SabiasDeTuCuerpo = () => {
  const [sobrevolado, setSobrevolado] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const [hayHover, setHayHover] = useState(true);
  const [sinMovimiento, setSinMovimiento] = useState(false);
  const espera = useRef(null);

  useEffect(() => {
    const hover = window.matchMedia?.('(hover: hover)');
    const quieto = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const aplicar = () => {
      setHayHover(hover ? hover.matches : true);
      setSinMovimiento(quieto ? quieto.matches : false);
    };
    aplicar();
    hover?.addEventListener?.('change', aplicar);
    quieto?.addEventListener?.('change', aplicar);
    return () => {
      hover?.removeEventListener?.('change', aplicar);
      quieto?.removeEventListener?.('change', aplicar);
    };
  }, []);

  useEffect(() => () => clearTimeout(espera.current), []);

  const alEntrar = useCallback((indice) => {
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setSobrevolado(indice), CUERPO.esperaAntesDeArrancar);
  }, []);

  const alSalir = useCallback(() => {
    clearTimeout(espera.current);
    setSobrevolado(null);
  }, []);

  // El foco no pasa por la espera: llegar con el tabulador ya es intención, no
  // es cruzar por encima camino de otra cosa.
  const alEnfocar = useCallback((indice) => {
    clearTimeout(espera.current);
    setSobrevolado(indice);
  }, []);

  return (
    <section id="cuerpo" className={`bg-white py-16 lg:py-20 ${canal}`}>
      <header className="mb-8 text-center lg:mb-10">
        <div className="flex justify-center">
          <Eyebrow>{CUERPO.eyebrow}</Eyebrow>
        </div>
        <h2 className="mt-4 font-display text-a-32 text-academy-tinta sm:text-a-44">
          {CUERPO.titulo}
        </h2>
        <p className="mt-3 font-ui text-a-15 text-academy-tinta-3">
          {hayHover ? CUERPO.subtitulo : CUERPO.subtituloTactil}
        </p>
      </header>

      {/* Seis columnas en escritorio: doce piezas en dos filas, que junto al
          encabezado caben en una pantalla sin tener que desplazarse. En móvil
          bajan a dos, porque a tres el gancho no se lee. */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-6 lg:gap-3">
        {CUERPO.piezas.map((pieza, indice) => (
          <Cuadro
            key={pieza.slug}
            pieza={pieza}
            adelantado={sobrevolado === indice && !sinMovimiento}
            conVideo={sobrevolado === indice && hayHover}
            onEntrar={hayHover ? () => alEntrar(indice) : undefined}
            onSalir={hayHover ? alSalir : undefined}
            onEnfocar={() => alEnfocar(indice)}
            onAbrir={() => setAbierto(indice)}
          />
        ))}
      </div>

      {abierto !== null && (
        <PanelDeCuriosidad
          indice={abierto}
          onCambiar={setAbierto}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </section>
  );
};

const Cuadro = ({ pieza, adelantado, conVideo, onEntrar, onSalir, onEnfocar, onAbrir }) => {
  const video = useRef(null);
  const [sinFoto, setSinFoto] = useState(false);
  const [sinVideo, setSinVideo] = useState(false);

  useEffect(() => {
    const nodo = video.current;
    if (!nodo) return;
    if (conVideo) {
      nodo.play?.().catch(() => { /* el navegador puede negarse; queda la foto */ });
    } else {
      nodo.pause?.();
      // Se rebobina: la próxima vez que alguien pase por aquí, el video
      // empieza por el principio y no por donde lo dejó otra persona.
      nodo.currentTime = 0;
    }
  }, [conVideo]);

  return (
    <button
      type="button"
      onMouseEnter={onEntrar}
      onMouseLeave={onSalir}
      onFocus={onEnfocar}
      onBlur={onSalir}
      onClick={onAbrir}
      aria-label={`${pieza.dato} Ver el video.`}
      className={[
        'group relative aspect-square overflow-hidden rounded-[4px] bg-academy-crema-2 text-left',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto focus-visible:ring-offset-2',
        adelantado ? 'z-20 scale-[1.08] shadow-2xl' : 'z-0',
      ].join(' ')}
    >
      {/* El cartel de la foto que falta va arriba y no en el centro: el gancho
          vive abajo, y centrado se le montaba encima. */}
      {sinFoto && (
        <span className="absolute inset-x-0 top-0 flex flex-col items-center gap-0.5 p-2 text-center" aria-hidden="true">
          <span className="font-ui text-[9px] uppercase tracking-[0.14em] text-academy-tinta-3">
            {pieza.slug}
          </span>
          <span className="font-ui text-[9px] text-academy-tinta-3/70">
            {CUERPO.medidaFoto.min}
          </span>
        </span>
      )}

      <img
        src={`/cuerpo/${pieza.slug}.jpg`}
        alt=""
        loading="lazy"
        onError={() => setSinFoto(true)}
        className={`absolute inset-0 h-full w-full object-cover ${sinFoto ? 'opacity-0' : ''}`}
      />

      <video
        ref={video}
        src={`/cuerpo/${pieza.slug}.mp4`}
        muted
        loop
        playsInline
        // Nada de `autoPlay`: lo arranca el cursor tras la espera. Y
        // `preload="none"` para no descargar doce videos al abrir la página.
        preload="none"
        onError={() => setSinVideo(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${conVideo && !sinVideo ? 'opacity-100' : 'opacity-0'}`}
      />

      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-academy-tinta via-academy-tinta/75 to-transparent"
        aria-hidden="true"
      />

      <span
        className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 transition-opacity duration-200 ${adelantado ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <Play size={12} className="ml-0.5 text-academy-tinta" />
      </span>

      <span className="absolute inset-x-0 bottom-0 p-3" aria-hidden="true">
        <span className="block font-ui text-[12px] leading-[1.3] text-white">
          {pieza.gancho}
        </span>
      </span>
    </button>
  );
};

export default SabiasDeTuCuerpo;
