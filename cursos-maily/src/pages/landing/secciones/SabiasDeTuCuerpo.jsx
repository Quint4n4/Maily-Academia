import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

import { CUERPO } from '../academy360Config';
import { Eyebrow } from './Piezas';
import { canal } from './estilos';

/**
 * Mosaico de curiosidades del cuerpo.
 *
 * Al pasar el cursor por una pieza, esta crece y reproduce un video corto. Es
 * un efecto sencillo de describir y lleno de trampas al construirlo; estas son
 * las cuatro que importan:
 *
 * - **En un móvil no hay cursor.** La mitad de quien entre no puede "pasar por
 *   encima" de nada. Se detecta con `(hover: hover)` --no con el ancho de la
 *   pantalla, que miente en tabletas y portátiles táctiles-- y en táctil la
 *   pieza se abre tocándola.
 * - **La pieza crece con `scale`, no cambiando de tamaño.** Si creciera de
 *   verdad empujaría a sus vecinas y el mosaico entero bailaría cada vez que
 *   alguien mueve el ratón. `scale` deforma el dibujo sin tocar la rejilla.
 * - **El video no arranca al instante.** Cruzar el mosaico de lado a lado
 *   pasa por encima de ocho piezas, y sin una pausa previa eso son ocho
 *   descargas que nadie pidió.
 * - **Arranca sin sonido, y no por gusto.** Ningún navegador deja sonar un
 *   video que empieza solo. El sonido llega al hacer clic, que ya es una
 *   interacción y sí lo permite.
 */
const SabiasDeTuCuerpo = () => {
  const [sobrevolada, setSobrevolada] = useState(null);
  const [fijada, setFijada] = useState(null);
  const [conSonido, setConSonido] = useState(false);
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

  const alEntrar = useCallback((slug) => {
    clearTimeout(espera.current);
    espera.current = setTimeout(() => setSobrevolada(slug), CUERPO.esperaAntesDeArrancar);
  }, []);

  const alSalir = useCallback(() => {
    clearTimeout(espera.current);
    setSobrevolada(null);
  }, []);

  const alPulsar = useCallback((slug) => {
    const siguiente = fijada === slug ? null : slug;
    setFijada(siguiente);
    setConSonido(siguiente !== null);
  }, [fijada]);

  // El foco no pasa por la espera: llegar con el tabulador ya es intención,
  // no es cruzar por encima camino de otra cosa.
  const alEnfocar = useCallback((slug) => {
    clearTimeout(espera.current);
    setSobrevolada(slug);
  }, []);

  useEffect(() => {
    if (!fijada) return undefined;
    const alPulsarTecla = (e) => { if (e.key === 'Escape') { setFijada(null); setConSonido(false); } };
    document.addEventListener('keydown', alPulsarTecla);
    return () => document.removeEventListener('keydown', alPulsarTecla);
  }, [fijada]);

  const activa = fijada ?? sobrevolada;

  return (
    <section id="cuerpo" className={`bg-white py-16 lg:py-[112px] ${canal}`}>
      <header className="mb-10 text-center lg:mb-14">
        <div className="flex justify-center">
          <Eyebrow>{CUERPO.eyebrow}</Eyebrow>
        </div>
        <h2 className="mt-5 font-display text-a-32 text-academy-tinta sm:text-a-44">
          {CUERPO.titulo}
        </h2>
        <p className="mt-3 font-ui text-a-15 text-academy-tinta-3">
          {hayHover ? CUERPO.subtitulo : CUERPO.subtituloTactil}
        </p>
      </header>

      {/* `grid-flow-dense` para que las piezas normales rellenen los huecos que
          dejan las dobles. Sin él, una doble que no cabe en la fila deja un
          agujero en el mosaico. */}
      <div className="mx-auto grid max-w-[1200px] auto-rows-[42vw] grid-flow-dense grid-cols-2 gap-3 sm:auto-rows-[195px] sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {CUERPO.piezas.map((pieza) => (
          <Pieza
            key={pieza.slug}
            pieza={pieza}
            activa={activa === pieza.slug}
            fijada={fijada === pieza.slug}
            conSonido={conSonido}
            sinMovimiento={sinMovimiento}
            hayHover={hayHover}
            onEntrar={() => alEntrar(pieza.slug)}
            onSalir={alSalir}
            onEnfocar={() => alEnfocar(pieza.slug)}
            onPulsar={() => alPulsar(pieza.slug)}
          />
        ))}
      </div>
    </section>
  );
};

const Pieza = ({
  pieza, activa, fijada, conSonido, sinMovimiento, hayHover,
  onEntrar, onSalir, onEnfocar, onPulsar,
}) => {
  const video = useRef(null);
  const [falla, setFalla] = useState(false);
  const [sinFoto, setSinFoto] = useState(false);

  useEffect(() => {
    const nodo = video.current;
    if (!nodo) return;
    if (activa) {
      nodo.play?.().catch(() => { /* el navegador puede negarse; queda la foto */ });
    } else {
      nodo.pause?.();
      // Se rebobina: la próxima vez que alguien pase por aquí, el video
      // empieza por el principio y no por donde lo dejó otra persona.
      nodo.currentTime = 0;
    }
  }, [activa]);

  useEffect(() => {
    const nodo = video.current;
    if (nodo) nodo.muted = !(fijada && conSonido);
  }, [fijada, conSonido]);

  const crece = activa && !sinMovimiento;

  return (
    <button
      type="button"
      onMouseEnter={hayHover ? onEntrar : undefined}
      onMouseLeave={hayHover ? onSalir : undefined}
      onFocus={onEnfocar}
      onBlur={onSalir}
      onClick={onPulsar}
      aria-pressed={fijada}
      className={[
        'group relative overflow-hidden rounded-[4px] bg-academy-crema-2 text-left',
        'transition-[transform,box-shadow] duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto focus-visible:ring-offset-2',
        crece ? 'z-20 scale-[1.06] shadow-2xl' : 'z-0',
        pieza.destacada ? 'sm:col-span-2 sm:row-span-2' : '',
      ].join(' ')}
    >
      {/* El marcador de la foto que falta va arriba y no en el centro: el dato
          vive abajo, y centrado se le montaba encima. */}
      {sinFoto && (
        <span className="absolute inset-x-0 top-0 flex flex-col items-center gap-0.5 p-3 text-center" aria-hidden="true">
          <span className="font-ui text-[10px] uppercase tracking-[0.14em] text-academy-tinta-3">
            {pieza.slug}
          </span>
          <span className="font-ui text-[10px] text-academy-tinta-3/70">
            mín. {CUERPO.medidaFoto.min}
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
        preload="none"
        onError={() => setFalla(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${activa && !falla ? 'opacity-100' : 'opacity-0'}`}
      />

      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-academy-tinta via-academy-tinta/75 to-transparent"
        aria-hidden="true"
      />

      {/* El icono desaparece en cuanto la pieza se abre: ya no hace falta decir
          que hay un video si se está viendo. */}
      <span
        className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 transition-opacity duration-200 ${activa ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
      >
        <Play size={14} className="ml-0.5 text-academy-tinta" />
      </span>

      {fijada && (
        <span
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
          aria-hidden="true"
        >
          {conSonido ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </span>
      )}

      <span className="absolute inset-x-0 bottom-0 p-4">
        <span
          className={`block font-ui leading-[1.4] text-white transition-all duration-300 ${
            activa ? 'text-a-15' : 'text-[13px]'
          }`}
        >
          {pieza.dato}
        </span>
        <span
          className={`mt-2 block font-ui text-[11px] uppercase tracking-[0.12em] text-white/70 transition-opacity duration-200 ${
            activa && !fijada ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {hayHover ? 'Clic para el sonido' : 'Toca para el sonido'}
        </span>
      </span>
    </button>
  );
};

export default SabiasDeTuCuerpo;
