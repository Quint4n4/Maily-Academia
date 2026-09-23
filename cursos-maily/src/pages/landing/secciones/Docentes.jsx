import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

import { DOCENTES } from '../academy360Config';
import { TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Docentes, en carrusel: una tarjeta al frente y las vecinas detrás,
 * encogidas y desenfocadas.
 *
 * Cuatro cosas que decidieron cómo está hecho:
 *
 * - **Las tarjetas se mueven con `transform`, no cambiando de posición.** Van
 *   todas apiladas en el mismo sitio y cada una se desplaza a donde le toca
 *   según su distancia al frente. Así el navegador no recalcula la posición de
 *   nada al pasar de una a otra: solo compone, que es lo que hace bien.
 * - **Solo suena y se reproduce la del frente.** Tres videos a la vez son tres
 *   descargas y tres decodificaciones para ver uno.
 * - **El bucle es circular de verdad.** Desde la primera, la anterior es la
 *   última. Calcular la distancia sin dar la vuelta haría que la última
 *   apareciera volando desde el otro extremo.
 * - **Se puede arrastrar.** En un móvil, unas flechas de 44 px son el único
 *   modo de avanzar si no se implementa el gesto, y nadie usa un carrusel así.
 */
const Docentes = () => {
  const [alFrente, setAlFrente] = useState(0);
  const [conSonido, setConSonido] = useState(false);
  const inicioDelGesto = useRef(null);

  const total = DOCENTES.lista.length;
  const ir = useCallback((salto) => {
    setAlFrente((i) => (i + salto + total) % total);
  }, [total]);

  const alEmpezarGesto = (e) => { inicioDelGesto.current = e.touches[0]?.clientX ?? null; };
  const alSoltar = (e) => {
    const inicio = inicioDelGesto.current;
    inicioDelGesto.current = null;
    if (inicio === null) return;
    const arrastre = inicio - (e.changedTouches[0]?.clientX ?? inicio);
    // 50 px: por debajo de eso es un toque con la mano poco firme, no un gesto.
    if (Math.abs(arrastre) > 50) ir(arrastre > 0 ? 1 : -1);
  };

  return (
    <section id="docentes" className={`overflow-hidden bg-academy-crema py-16 lg:py-[112px] ${canal}`}>
      <TituloDeSeccion titulo={DOCENTES.titulo} subtitulo={DOCENTES.subtitulo} />

      <div
        className="relative mx-auto h-[427px] max-w-[1200px] sm:h-[498px] lg:h-[569px]"
        onTouchStart={alEmpezarGesto}
        onTouchEnd={alSoltar}
        role="group"
        aria-roledescription="carrusel"
        aria-label={DOCENTES.titulo}
      >
        {DOCENTES.lista.map((docente, indice) => (
          <Tarjeta
            key={docente.slug}
            docente={docente}
            distancia={distanciaCircular(indice, alFrente, total)}
            conSonido={conSonido}
            posicion={`${indice + 1} de ${total}`}
            onCentrar={() => setAlFrente(indice)}
            onAlternarSonido={() => setConSonido((v) => !v)}
          />
        ))}

        <Flecha hacia="anterior" onClick={() => ir(-1)} />
        <Flecha hacia="siguiente" onClick={() => ir(1)} />
      </div>

      <div className="mt-8 flex justify-center gap-2">
        {DOCENTES.lista.map((docente, indice) => (
          <button
            key={docente.slug}
            type="button"
            onClick={() => setAlFrente(indice)}
            aria-label={`Ver al docente ${indice + 1}`}
            aria-current={indice === alFrente}
            // La zona pulsable mide 44 px aunque el punto se vea de 8: por
            // debajo de eso un dedo falla más de lo que acierta.
            className="flex h-11 w-11 items-center justify-center"
          >
            <span
              className={`block h-2 w-2 rounded-full transition-colors ${
                indice === alFrente ? 'bg-academy-oro-texto' : 'bg-academy-linea'
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
};

/**
 * Distancia al frente, dando la vuelta por el camino más corto.
 *
 * Con cuatro docentes y el primero al frente, el cuarto está a -1 y no a +3:
 * sin esto entraría volando desde el otro extremo cada vez que se retrocede.
 */
const distanciaCircular = (indice, alFrente, total) => {
  let d = indice - alFrente;
  if (d > total / 2) d -= total;
  if (d < -total / 2) d += total;
  return d;
};

const Tarjeta = ({ docente, distancia, conSonido, posicion, onCentrar, onAlternarSonido }) => {
  const video = useRef(null);
  const [sinVideo, setSinVideo] = useState(false);
  const [sinFoto, setSinFoto] = useState(false);

  const enfrente = distancia === 0;
  // Solo se dibujan la del frente y sus dos vecinas. Las demás estorban: se
  // superpondrían detrás sin que nadie las vea.
  const ala = Math.abs(distancia) <= 1;

  useEffect(() => {
    const nodo = video.current;
    if (!nodo) return;
    if (enfrente) {
      nodo.play?.().catch(() => { /* el navegador puede negarse; queda la foto */ });
    } else {
      nodo.pause?.();
      nodo.currentTime = 0;
    }
  }, [enfrente]);

  useEffect(() => {
    const nodo = video.current;
    if (nodo) nodo.muted = !(enfrente && conSonido);
  }, [enfrente, conSonido]);

  return (
    <div
      // Se enumeran las tres propiedades en vez de usar `transition-all`:
      // `all` incluye el `z-index`, que es un entero y se interpola a saltos,
      // así que durante el medio segundo del cambio las tarjetas quedan
      // apiladas en un orden que no es ni el de antes ni el de después.
      className="absolute left-1/2 top-0 w-[240px] transition-[transform,opacity,filter] duration-500 ease-out sm:w-[280px] lg:w-[320px]"
      style={{
        // El `-50%` centra la tarjeta y el resto la aparta: los dos van en el
        // mismo `transform` porque una segunda declaración lo sobreescribiría.
        transform: `translateX(calc(-50% + ${distancia * 64}%)) scale(${enfrente ? 1 : 0.82})`,
        filter: enfrente ? 'none' : 'blur(4px)',
        opacity: ala ? (enfrente ? 1 : 0.55) : 0,
        zIndex: enfrente ? 20 : 10,
        pointerEvents: ala ? 'auto' : 'none',
      }}
      aria-hidden={!ala}
    >
      <button
        type="button"
        onClick={enfrente ? onAlternarSonido : onCentrar}
        aria-label={enfrente
          ? (conSonido ? 'Quitar el sonido' : 'Activar el sonido')
          : `Ver a ${docente.nombre}`}
        tabIndex={ala ? 0 : -1}
        className={`relative block aspect-[9/16] w-full overflow-hidden rounded-[8px] bg-academy-tinta text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto focus-visible:ring-offset-2 ${
          enfrente ? 'shadow-[0_24px_60px_-20px_rgba(31,27,20,0.55)]' : ''
        }`}
      >
        {/* El cartel del archivo que falta va debajo y el video encima, como en
            el resto de la landing: el hueco nunca se queda en negro sin decir
            qué le falta. */}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center" aria-hidden="true">
          <span className="font-ui text-[11px] uppercase tracking-[0.14em] text-white/45">
            {docente.slug}
          </span>
          <span className="font-ui text-[11px] text-white/30">
            mín. {DOCENTES.medidaVideo.min} · vertical
          </span>
        </span>

        <img
          src={`/docentes/${docente.slug}.jpg`}
          alt=""
          loading="lazy"
          onError={() => setSinFoto(true)}
          className={`absolute inset-0 h-full w-full object-cover ${sinFoto ? 'opacity-0' : ''}`}
        />

        <video
          ref={video}
          src={`/docentes/${docente.slug}.mp4`}
          poster={`/docentes/${docente.slug}.jpg`}
          muted
          loop
          playsInline
          preload="none"
          onError={() => setSinVideo(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            enfrente && !sinVideo ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-academy-tinta via-academy-tinta/70 to-transparent"
          aria-hidden="true"
        />

        {enfrente && (
          <span
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            aria-hidden="true"
          >
            {conSonido ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </span>
        )}

        <span className="absolute inset-x-0 bottom-0 p-5">
          <span className="block font-display text-a-25 leading-tight text-white">
            {docente.nombre}
          </span>
          <span className="mt-1 block font-ui text-a-15 text-white/75">
            {docente.especialidad}
          </span>
          <span className="sr-only">{posicion}</span>
        </span>
      </button>
    </div>
  );
};

const Flecha = ({ hacia, onClick }) => {
  const anterior = hacia === 'anterior';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={anterior ? 'Docente anterior' : 'Docente siguiente'}
      className={`absolute top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-academy-tinta shadow-lg transition-colors hover:bg-academy-crema-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro-texto ${
        anterior ? 'left-0 lg:left-8' : 'right-0 lg:right-8'
      }`}
    >
      {anterior ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
};

export default Docentes;
