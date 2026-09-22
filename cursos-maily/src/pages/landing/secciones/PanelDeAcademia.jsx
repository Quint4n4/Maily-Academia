import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Volume2, VolumeX, X } from 'lucide-react';

import { ACADEMIAS } from '../academy360Config';

/**
 * Feed de una academia, al estilo de TikTok: videos verticales que se pasan
 * deslizando hacia abajo, y al terminar el último se vuelve al primero.
 *
 * Cuatro cosas que hacen que un feed así funcione y que casi nunca se hacen:
 *
 * - **Solo suena y se reproduce el video que se está viendo.** Con diez
 *   `<video autoPlay>` a la vez, el navegador descarga diez archivos y el
 *   ventilador del portátil se entera. Se usa un IntersectionObserver.
 * - **Los videos no se precargan.** `preload="none"` hasta que toca: si no,
 *   abrir el panel se lleva decenas de megas por delante.
 * - **El bucle es de verdad.** Al pasar del último se salta al primero sin
 *   animación, así que el gesto nunca se queda sin respuesta.
 * - **Arranca sin sonido.** Un video que suena solo es la forma más rápida de
 *   que cierren la pestaña.
 */
const PanelDeAcademia = ({ academia, onCerrar }) => {
  const carril = useRef(null);
  const botonCerrar = useRef(null);
  const videos = useRef([]);
  const [visible, setVisible] = useState(0);
  const [conSonido, setConSonido] = useState(false);

  const lista = academia.videos?.length
    ? academia.videos
    : [{ src: academia.video, numero: 1 }];

  // --- Teclado, foco y scroll de la página de detrás -------------------
  useEffect(() => {
    const abridor = document.activeElement;
    botonCerrar.current?.focus();

    const alPulsar = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPulsar);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = previo;
      if (abridor instanceof HTMLElement) abridor.focus();
    };
  }, [onCerrar]);

  // --- Reproducir solo el que se ve ------------------------------------
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          const indice = Number(entrada.target.dataset.indice);
          const video = videos.current[indice];
          if (!video) return;
          if (entrada.isIntersecting) {
            setVisible(indice);
            video.play?.().catch(() => { /* el navegador puede negarse; no pasa nada */ });
          } else {
            video.pause?.();
          }
        });
      },
      { threshold: 0.6 },
    );

    const secciones = carril.current?.querySelectorAll('[data-indice]') ?? [];
    secciones.forEach((s) => observador.observe(s));
    return () => observador.disconnect();
  }, [lista.length]);

  // --- El bucle ---------------------------------------------------------
  const alDesplazar = useCallback(() => {
    const nodo = carril.current;
    if (!nodo || !ACADEMIAS.enBucle) return;
    const alFinal = nodo.scrollTop + nodo.clientHeight >= nodo.scrollHeight - 2;
    if (alFinal && visible === lista.length - 1) {
      // Se marca, pero no se salta todavía: saltar mientras el dedo sigue
      // apoyado pelea con el gesto. Se hace al soltar, en `alTerminarGesto`.
      nodo.dataset.alFinal = 'si';
    } else {
      delete nodo.dataset.alFinal;
    }
  }, [visible, lista.length]);

  const alTerminarGesto = useCallback(() => {
    const nodo = carril.current;
    if (!nodo || nodo.dataset.alFinal !== 'si') return;
    delete nodo.dataset.alFinal;
    // `scrollTop` directo y no `scrollTo`: es lo unico que ignora con
    // seguridad cualquier desplazamiento suave heredado. Con animacion, el
    // bucle recorreria las diez pantallas de vuelta.
    nodo.scrollTop = 0;
    setVisible(0);
  }, []);

  const alternarSonido = () => {
    const actual = videos.current[visible];
    if (!actual) return;
    actual.muted = conSonido;
    setConSonido((v) => !v);
  };

  const irAlSiguiente = () => {
    const nodo = carril.current;
    if (!nodo) return;
    const siguiente = visible + 1;
    if (siguiente >= lista.length) {
      nodo.scrollTop = 0;
      setVisible(0);
      return;
    }
    nodo.scrollTo({ top: siguiente * nodo.clientHeight, behavior: 'smooth' });
  };

  const { cta } = academia;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-academy-tinta/90 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Academia ${academia.nombre}`}
    >
      <div className="relative h-full max-h-[85vh] w-full max-w-[420px] overflow-hidden rounded-[4px] bg-black">
        <button
          ref={botonCerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          onClick={alternarSonido}
          aria-label={conSonido ? 'Quitar el sonido' : 'Activar el sonido'}
          className="absolute left-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          {conSonido ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        <span className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 font-ui text-[11px] text-white/90">
          {visible + 1} / {lista.length}
        </span>

        {/* El carril: cada video ocupa la pantalla entera y el scroll encaja
            en uno u otro, sin posiciones intermedias. */}
        <div
          ref={carril}
          onScroll={alDesplazar}
          onTouchEnd={alTerminarGesto}
          onMouseUp={alTerminarGesto}
          onWheel={alTerminarGesto}
          className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {lista.map((video, indice) => (
            <section
              key={video.src ?? indice}
              data-indice={indice}
              className="relative h-full w-full snap-start snap-always"
            >
              <Diapositiva
                video={video}
                poster={academia.imagen}
                nombre={academia.nombre}
                registra={(nodo) => { videos.current[indice] = nodo; }}
              />

              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent"
                aria-hidden="true"
              />

              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3 className="font-display text-a-25 text-white">{academia.nombre}</h3>
                <p className="mt-2 font-ui text-a-15 leading-[1.6] text-white/85">
                  {video.titulo ?? academia.descripcion}
                </p>

                <div className="mt-5">
                  <BotonDeAcademia cta={cta} />
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Pista de que hay más abajo. Se va en cuanto alguien se mueve. */}
        {visible === 0 && lista.length > 1 && (
          <button
            type="button"
            onClick={irAlSiguiente}
            aria-label="Ver el siguiente video"
            className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 animate-bounce text-white/70 hover:text-white"
          >
            <ChevronDown size={26} />
          </button>
        )}
      </div>
    </div>
  );
};

const BotonDeAcademia = ({ cta }) => {
  const clases =
    'inline-flex h-[52px] items-center justify-center rounded-[4px] bg-academy-oro px-7 '
    + 'font-ui text-a-15 tracking-[0.04em] text-academy-sobre-oro transition-[filter] hover:brightness-95';

  if (!cta.a) {
    // Sin dirección todavía: apagado y diciendo por qué, en vez de un enlace
    // que no lleva a ninguna parte.
    return (
      <span
        className="inline-flex h-[52px] cursor-not-allowed items-center justify-center rounded-[4px] bg-white/15 px-7 font-ui text-a-15 text-white/50"
        title="Falta la dirección de destino"
      >
        {cta.texto}
      </span>
    );
  }
  if (cta.externo) {
    return (
      <a href={cta.a} target="_blank" rel="noopener noreferrer" className={clases}>
        {cta.texto}
      </a>
    );
  }
  return <Link to={cta.a} className={clases}>{cta.texto}</Link>;
};

/** Un video del feed, o su marcador si el archivo no está. */
const Diapositiva = ({ video, poster, nombre, registra }) => {
  const [falla, setFalla] = useState(!video.src);

  if (falla) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-academy-tinta text-center">
        <p className="font-ui text-[11px] uppercase tracking-[0.14em] text-white/50">
          Video {video.numero} de {nombre}
        </p>
        <p className="font-ui text-[11px] text-white/35">
          mín. {ACADEMIAS.medidaVideo.min} · vertical
        </p>
      </div>
    );
  }

  return (
    <video
      ref={registra}
      src={video.src}
      poster={poster}
      muted
      loop
      playsInline
      // Nada de `autoPlay`: lo arranca el observador cuando toca. Y
      // `preload="none"` para no descargar diez videos al abrir el panel.
      preload="none"
      onError={() => setFalla(true)}
      className="h-full w-full object-cover"
    />
  );
};

export default PanelDeAcademia;
