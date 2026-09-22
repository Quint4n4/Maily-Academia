import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Volume2, VolumeX, X } from 'lucide-react';

import { ACADEMIAS } from '../academy360Config';

/**
 * Panel a pantalla completa de una academia, al estilo de TikTok: video
 * vertical, texto encima y un solo botón.
 *
 * Lo que un panel así tiene que hacer bien, y casi nunca hace:
 *
 * - Cerrarse con Escape. Es lo primero que pulsa quien se arrepiente.
 * - Devolver el foco al botón que lo abrió, o quien navega con teclado
 *   aparece al principio de la página sin saber por qué.
 * - Parar la página de detrás. Sin esto, al hacer scroll dentro del panel se
 *   mueve el fondo y al cerrar has perdido el sitio donde estabas.
 * - Arrancar el video SIN sonido. Un video que suena solo al abrirse es la
 *   forma más rápida de que alguien cierre la pestaña entera.
 */
const PanelDeAcademia = ({ academia, onCerrar }) => {
  const panel = useRef(null);
  const botonCerrar = useRef(null);
  const video = useRef(null);
  const [conSonido, setConSonido] = useState(false);

  useEffect(() => {
    const abridor = document.activeElement;
    botonCerrar.current?.focus();

    const alPulsar = (evento) => {
      if (evento.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', alPulsar);

    const scrollPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = scrollPrevio;
      // El foco vuelve a donde estaba, no al principio del documento.
      if (abridor instanceof HTMLElement) abridor.focus();
    };
  }, [onCerrar]);

  const alternarSonido = () => {
    if (!video.current) return;
    video.current.muted = conSonido;
    setConSonido((v) => !v);
  };

  const { cta } = academia;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-academy-tinta/90 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Academia ${academia.nombre}`}
      ref={panel}
    >
      <div className="relative flex max-h-full w-full max-w-[420px] flex-col overflow-hidden rounded-[4px] bg-black">
        <button
          ref={botonCerrar}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
        >
          <X size={20} />
        </button>

        <div className="relative aspect-[9/16] w-full bg-academy-tinta">
          <VideoOMarcador
            ref={video}
            src={academia.video}
            poster={academia.imagen}
            nombre={academia.nombre}
          />

          {/* Degradado para que el texto se lea sobre cualquier fotograma. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/70 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="font-display text-a-28 text-white">{academia.nombre}</h3>
            <p className="mt-3 font-ui text-a-15 leading-[1.6] text-white/85">
              {academia.descripcion}
            </p>

            <div className="mt-6">
              {cta.a && !cta.externo && (
                <Link
                  to={cta.a}
                  className="inline-flex h-[52px] items-center justify-center rounded-[4px] bg-academy-oro px-7 font-ui text-a-15 tracking-[0.04em] text-academy-sobre-oro transition-[filter] hover:brightness-95"
                >
                  {cta.texto}
                </Link>
              )}
              {cta.a && cta.externo && (
                <a
                  href={cta.a}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[52px] items-center justify-center rounded-[4px] bg-academy-oro px-7 font-ui text-a-15 tracking-[0.04em] text-academy-sobre-oro transition-[filter] hover:brightness-95"
                >
                  {cta.texto}
                </a>
              )}
              {!cta.a && (
                // Sin dirección todavía: se enseña deshabilitado en vez de un
                // enlace que no lleva a ninguna parte.
                <span
                  className="inline-flex h-[52px] cursor-not-allowed items-center justify-center rounded-[4px] bg-white/15 px-7 font-ui text-a-15 text-white/50"
                  title="Falta la dirección de destino"
                >
                  {cta.texto}
                </span>
              )}
            </div>
          </div>

          {academia.video && (
            <button
              type="button"
              onClick={alternarSonido}
              aria-label={conSonido ? 'Quitar el sonido' : 'Activar el sonido'}
              className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              {conSonido ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** El video, o un marcador con la medida que hace falta. */
const VideoOMarcador = ({ ref: referencia, src, poster, nombre }) => {
  const [falla, setFalla] = useState(!src);

  if (falla) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-academy-tinta text-center">
        <p className="font-ui text-[11px] uppercase tracking-[0.14em] text-white/50">
          Video de {nombre}
        </p>
        <p className="font-ui text-[11px] text-white/35">
          mín. {ACADEMIAS.medidaVideo.min} · vertical
        </p>
      </div>
    );
  }

  return (
    <video
      ref={referencia}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setFalla(true)}
      className="h-full w-full object-cover"
    />
  );
};

export default PanelDeAcademia;
