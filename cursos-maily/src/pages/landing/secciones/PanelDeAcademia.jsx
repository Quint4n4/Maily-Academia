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
          // Saber por dónde va el feed NO puede depender de que exista el
          // elemento `video`. Cuando un archivo falla, su `Diapositiva` pasa a
          // marcador y React vacía la referencia; si se saliera aquí, un solo
          // video caído --un 404, la red a medias-- congelaría el contador y
          // la reproducción del resto.
          const video = videos.current[indice];
          if (entrada.isIntersecting) {
            setVisible(indice);
            video?.play?.().catch(() => { /* el navegador puede negarse; no pasa nada */ });
          } else {
            video?.pause?.();
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
  //
  // Lo que hay que detectar no es "estoy en el último video" sino "estoy en el
  // último y aun así sigo deslizando". La diferencia importa: con la primera
  // condición, el gesto que te lleva al décimo ya cumple el salto y el décimo
  // no llega a verse nunca.
  //
  // Por eso el táctil mira si YA estabas al final cuando empezó el gesto, y no
  // dónde acabaste. Y por eso no se usa `visible`: lo actualiza el observador,
  // que llega cuando llega, y hacer depender el salto de ese momento es una
  // carrera que a veces se pierde.

  /** Cuánto hay que arrastrar para que cuente como "quiero seguir". */
  const UMBRAL = 60;

  const inicioDelGesto = useRef(null);
  const veniaDelFinal = useRef(false);

  const estaAlFinal = () => {
    const nodo = carril.current;
    return !!nodo && nodo.scrollTop + nodo.clientHeight >= nodo.scrollHeight - 2;
  };

  const volverAlPrimero = useCallback(() => {
    const nodo = carril.current;
    if (!nodo) return;
    // `snap-mandatory` no es pasivo: recuerda a qué sección está enganchado y
    // la restaura en cuanto hay un relayout, pisando un `scrollTop` que se
    // acabe de asignar. Medido: pedir 0 y quedarse en 6212. Se apaga durante
    // el salto y se devuelve dos cuadros después, ya con la posición nueva.
    nodo.style.scrollSnapType = 'none';
    // `scrollTop` directo y no `scrollTo`: es lo único que ignora con
    // seguridad cualquier desplazamiento suave heredado. Con animación, el
    // bucle recorrería las diez pantallas de vuelta.
    nodo.scrollTop = 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { nodo.style.scrollSnapType = ''; });
    });
    setVisible(0);
  }, []);

  const alRodar = useCallback((evento) => {
    // La rueda se evalúa antes de que el navegador mueva nada, así que el tick
    // que te lleva al último todavía ve `estaAlFinal` en falso. El siguiente
    // ya no, y ese es el que debe saltar.
    if (!ACADEMIAS.enBucle || evento.deltaY <= 0) return;
    if (estaAlFinal()) volverAlPrimero();
  }, [volverAlPrimero]);

  const alEmpezarGesto = useCallback((evento) => {
    inicioDelGesto.current = evento.touches[0]?.clientY ?? null;
    veniaDelFinal.current = estaAlFinal();
  }, []);

  const alSoltar = useCallback((evento) => {
    if (!ACADEMIAS.enBucle) return;
    const inicio = inicioDelGesto.current;
    inicioDelGesto.current = null;
    if (inicio === null || !veniaDelFinal.current) return;
    // El dedo sube cuando el contenido baja, de ahí la resta en este orden.
    const arrastre = inicio - (evento.changedTouches[0]?.clientY ?? inicio);
    if (arrastre > UMBRAL) volverAlPrimero();
  }, [volverAlPrimero]);

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
          onWheel={alRodar}
          onTouchStart={alEmpezarGesto}
          onTouchEnd={alSoltar}
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
                {/* El logo va dentro de una pastilla clara y no suelto sobre el
                    video, por dos razones que se ven en cuanto se prueba:
                    dos de las tres marcas llevan texto gris oscuro --"maily" y
                    "CORPORATIVO"-- que sobre negro desaparece, y el fondo real
                    no es negro sino un video que cambia de color en cada
                    fotograma. Con la pastilla, el contraste deja de depender
                    de lo que se esté reproduciendo.

                    Sigue siendo un `h3`: su texto accesible es el `alt`, así
                    que un lector de pantalla anuncia el nombre igual que
                    cuando esto era texto.

                    `max-h` en vez de `h`: con altura fija, un logo tan ancho
                    como el de Longevity 360 se quedaría flotando en una caja
                    con aire arriba y abajo. */}
                <h3 className="inline-flex min-h-[56px] items-center rounded-[4px] bg-white px-4 py-2">
                  <img
                    src={academia.logo}
                    alt={academia.nombre}
                    className="max-h-12 max-w-[200px] object-contain"
                  />
                </h3>
                <p className="mt-3 font-ui text-a-15 leading-[1.6] text-white/85">
                  {video.titulo ?? academia.descripcion}
                </p>

                <div className="mt-5">
                  <BotonDeAcademia cta={cta} />
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Pista de que hay más abajo. Se va en cuanto alguien se mueve.

            A la derecha y no centrada: centrada cae justo al lado del botón de
            la academia --que empieza en el margen izquierdo-- y los dos quedan
            pegados, con el riesgo de pulsar el que no era. Alineada con el alto
            del botón se lee como lo que es, un control secundario. */}
        {visible === 0 && lista.length > 1 && (
          <button
            type="button"
            onClick={irAlSiguiente}
            aria-label="Ver el siguiente video"
            className="absolute bottom-[38px] right-5 z-20 animate-bounce text-white/70 hover:text-white"
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
    // `rel="noopener"` no es decorativo: sin él, la página que se abre recibe
    // un `window.opener` con el que puede redirigir esta pestaña a donde
    // quiera. El `aria-label` avisa de que el enlace sale del sitio, que de
    // otro modo solo se nota al ver la pestaña nueva.
    return (
      <a
        href={cta.a}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${cta.texto} (se abre en una pestaña nueva)`}
        className={clases}
      >
        {cta.texto}
      </a>
    );
  }
  return <Link to={cta.a} className={clases}>{cta.texto}</Link>;
};

/**
 * Un video del feed, con su marcador debajo por si el archivo no está.
 *
 * El marcador va SIEMPRE de fondo y el video encima, escondido cuando falla.
 * Lo natural sería poner uno *o* el otro, pero sustituir un elemento por otro
 * provoca un relayout, y `snap-mandatory` responde a cada relayout devolviendo
 * el scroll a la sección que tenía enganchada. Con diez archivos que faltan
 * eso son diez tirones, y el feed se vuelve impredecible. Así la estructura no
 * cambia nunca: solo se desvanece el video.
 */
const Diapositiva = ({ video, poster, nombre, registra }) => {
  const [falla, setFalla] = useState(false);

  return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-academy-tinta text-center">
        <p className="font-ui text-[11px] uppercase tracking-[0.14em] text-white/50">
          Video {video.numero} de {nombre}
        </p>
        <p className="font-ui text-[11px] text-white/35">
          mín. {ACADEMIAS.medidaVideo.min} · vertical
        </p>
      </div>

      {video.src && (
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
          className={`relative h-full w-full object-cover transition-opacity ${falla ? 'opacity-0' : ''}`}
        />
      )}
    </>
  );
};

export default PanelDeAcademia;
