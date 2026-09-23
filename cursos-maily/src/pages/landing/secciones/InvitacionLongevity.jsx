import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { LONGEVITY } from '../academy360Config';
import { canal } from './estilos';

/**
 * Invitación a Longevity 360: titular, el logo en grande y la entrada al
 * login.
 *
 * Sustituye a "Áreas de salud", que listaba las academias con vitrina y venía
 * a decir lo mismo que "Nuestras academias" tres secciones antes.
 *
 * Tres cosas de las que conviene acordarse:
 *
 * - **Todo el bloque es UN enlace, no dos.** El logo y el botón llevan al
 *   mismo sitio; como enlaces separados, un lector de pantalla anunciaría dos
 *   destinos idénticos seguidos y el tabulador pararía dos veces en lo mismo.
 * - **El latido se apaga solo.** Va con `motion-safe:`, que lo desactiva en
 *   cuanto el sistema pide menos movimiento. Una animación infinita es justo
 *   lo que marea a quien lleva eso activado, y aquí no aporta información:
 *   quitarla no cambia nada de lo que dice la sección.
 * - **El logo no es el texto accesible.** Lleva `alt=""` porque el nombre ya
 *   está escrito debajo; con `alt="Longevity 360"` el enlace se leería
 *   "Longevity 360, Longevity 360, entrar a Longevity 360".
 */
const InvitacionLongevity = () => (
  // `overflow-hidden` por el latido: el `scale` no respeta el `max-w` del
  // logo, así que en una pantalla muy estrecha el punto más alto del ciclo se
  // saldría unos píxeles y aparecería una barra de desplazamiento lateral.
  <section id="longevity" className={`overflow-hidden bg-academy-tinta py-20 text-center lg:py-[120px] ${canal}`}>
    <Link
      to={LONGEVITY.cta.a}
      className="group mx-auto block max-w-[900px] rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-academy-oro focus-visible:ring-offset-4 focus-visible:ring-offset-academy-tinta"
    >
      <h2 className="font-display text-a-32 leading-[1.15] text-white sm:text-a-44">
        {LONGEVITY.titulo}
        <br />
        <span className="text-white/70">{LONGEVITY.tituloSegundaLinea}</span>
      </h2>

      {/* El contenedor marca el tamaño y la animación vive en la imagen: si
          latiera el contenedor, arrastraría con él al texto de abajo. */}
      <div className="mt-8 flex justify-center lg:mt-10">
        <img
          src={LONGEVITY.logo}
          alt=""
          className="w-[280px] max-w-full motion-safe:animate-latido sm:w-[480px] lg:w-[760px]"
        />
      </div>

      <p className="mx-auto mt-8 max-w-[560px] font-ui text-a-15 leading-[1.7] text-white/70 lg:mt-10 lg:text-a-17">
        {LONGEVITY.texto}
      </p>

      {/* Un `span` y no un `Link`: ya estamos dentro de uno, y anidar enlaces
          es HTML inválido -- el navegador los desanida por su cuenta y el
          resultado depende de cuál. */}
      <span className="mt-9 inline-flex h-[52px] items-center justify-center gap-2 rounded-[4px] bg-academy-oro px-7 font-ui text-a-15 tracking-[0.04em] text-academy-sobre-oro transition-[filter] group-hover:brightness-95">
        {LONGEVITY.cta.texto}
        <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </Link>
  </section>
);

export default InvitacionLongevity;
