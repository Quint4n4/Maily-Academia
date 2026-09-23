import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';

import { CUERPO } from '../academy360Config';

/**
 * Una curiosidad a pantalla grande, en horizontal.
 *
 * Se abre al pulsar un cuadro del mosaico y deja pasar a la siguiente sin
 * cerrarlo, con las flechas o con el teclado.
 *
 * Dos cosas que conviene saber antes de tocar esto:
 *
 * - **Aquí el video SÍ puede sonar.** En el mosaico no: un video que arranca
 *   solo tiene que ir mudo o el navegador no lo reproduce siquiera. Al pulsar
 *   ya hay una interacción de por medio, que es justo lo que los navegadores
 *   piden para dejar sonar algo. Aun así se intenta y se comprueba: si el
 *   navegador lo rechaza igualmente, se reintenta en silencio en vez de
 *   quedarse con una pantalla congelada.
 * - **Cada video se monta de cero** (`key` en el elemento). Reaprovechar el
 *   mismo `<video>` cambiándole el `src` deja restos del anterior --el
 *   fotograma congelado, el tiempo, a veces el sonido-- durante el rato que
 *   tarda en cargar el nuevo.
 */
const PanelDeCuriosidad = ({ indice, onCambiar, onCerrar }) => {
  const botonCerrar = useRef(null);
  const [conSonido, setConSonido] = useState(true);

  const piezas = CUERPO.piezas;
  const pieza = piezas[indice];

  const anterior = useCallback(() => onCambiar((indice - 1 + piezas.length) % piezas.length), [indice, piezas.length, onCambiar]);
  const siguiente = useCallback(() => onCambiar((indice + 1) % piezas.length), [indice, piezas.length, onCambiar]);

  // --- Teclado, foco y scroll de la página de detrás -------------------
  useEffect(() => {
    const abridor = document.activeElement;
    botonCerrar.current?.focus();

    const alPulsar = (e) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowRight') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    document.addEventListener('keydown', alPulsar);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.body.style.overflow = previo;
      if (abridor instanceof HTMLElement) abridor.focus();
    };
  }, [onCerrar, siguiente, anterior]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-academy-tinta/95 p-4 sm:p-8"
      onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
      role="dialog"
      aria-modal="true"
      aria-label={pieza.dato}
    >
      <div className="relative w-full max-w-[1100px]">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-ui text-[12px] uppercase tracking-[0.16em] text-white/60">
            {indice + 1} / {piezas.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConSonido((v) => !v)}
              aria-label={conSonido ? 'Quitar el sonido' : 'Activar el sonido'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              {conSonido ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button
              ref={botonCerrar}
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* `key` con el slug: al cambiar de curiosidad el reproductor se monta
            de cero. Reaprovechar el mismo deja restos del anterior --el
            fotograma congelado, el tiempo, a veces el sonido-- durante el rato
            que tarda en cargar el nuevo, y además reinicia solo su estado. */}
        <Reproductor
          key={pieza.slug}
          pieza={pieza}
          conSonido={conSonido}
          setConSonido={setConSonido}
        />

        <p className="mt-5 max-w-[760px] font-display text-a-25 leading-[1.25] text-white lg:text-a-32">
          {pieza.dato}
        </p>

        {/* Las flechas van fuera del video en pantallas anchas y encima de él
            cuando no hay sitio. Encima del video siempre taparían parte de lo
            que se está viendo. */}
        <button
          type="button"
          onClick={anterior}
          aria-label="Curiosidad anterior"
          className="absolute left-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 lg:-left-16 lg:bg-white/10 lg:hover:bg-white/20"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={siguiente}
          aria-label="Curiosidad siguiente"
          className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 lg:-right-16 lg:bg-white/10 lg:hover:bg-white/20"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
};

/**
 * El video en sí.
 *
 * Aparte del panel para que `key` pueda remontarlo al cambiar de curiosidad:
 * así no hace falta ningún efecto que vaya reseteando su estado a mano.
 */
const Reproductor = ({ pieza, conSonido, setConSonido }) => {
  const video = useRef(null);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    const nodo = video.current;
    if (nodo) nodo.muted = !conSonido;
  }, [conSonido]);

  useEffect(() => {
    const nodo = video.current;
    if (!nodo) return;
    nodo.play().catch(() => {
      // Rechazado pese al clic: se pasa a silencio y se vuelve a intentar, que
      // es lo único que el navegador acepta sin discusión. Mejor verlo mudo
      // que quedarse mirando un fotograma congelado.
      nodo.muted = true;
      setConSonido(false);
      nodo.play().catch(() => { /* ni así; queda el cartel */ });
    });
  }, [setConSonido]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[4px] bg-black">
      {/* El cartel de "falta el archivo" va debajo y el video encima, como en
          el resto de la landing: así el hueco nunca se queda en negro sin
          explicación. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <p className="font-ui text-[11px] uppercase tracking-[0.14em] text-white/45">
          {pieza.slug}.mp4
        </p>
        <p className="font-ui text-[11px] text-white/30">
          mín. {CUERPO.medidaVideo.min} · {CUERPO.medidaVideo.css}
        </p>
      </div>

      <video
        ref={video}
        src={`/cuerpo/${pieza.slug}.mp4`}
        poster={`/cuerpo/${pieza.slug}.jpg`}
        loop
        playsInline
        controls
        preload="auto"
        onError={() => setFalla(true)}
        className={`relative h-full w-full object-contain ${falla ? 'opacity-0' : ''}`}
      />
    </div>
  );
};

export default PanelDeCuriosidad;
