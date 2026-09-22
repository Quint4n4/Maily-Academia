import { CIERRE } from '../academy360Config';
import { Boton, Foto } from './Piezas';

/** Banda final: foto a sangre con velo claro encima y los dos CTA. */
const CierreCTA = () => (
  <section className="relative isolate flex min-h-[340px] items-center justify-center overflow-hidden px-6 py-16 text-center lg:min-h-[399px]">
    <div className="absolute inset-0 -z-20">
      <Foto src={CIERRE.foto.src} alt={CIERRE.foto.alt} min={CIERRE.foto.min} etiqueta="Foto de fondo" className="h-full w-full" />
    </div>
    {/* Velo: sin el, el texto cae sobre una foto cualquiera y el contraste deja
        de ser predecible. */}
    <div className="absolute inset-0 -z-10 bg-academy-crema/85 dark:bg-academy-tinta/85" aria-hidden="true" />

    <div className="max-w-[640px]">
      <span className="mx-auto block h-px w-10 bg-academy-oro" aria-hidden="true" />
      <h2 className="mt-7 font-display text-a-32 leading-[1.1] text-academy-tinta sm:text-a-46 lg:text-a-54 dark:text-academy-crema">
        {CIERRE.titulo}
      </h2>
      <p className="mt-4 font-ui text-a-17 text-academy-sobre-oro dark:text-white/70">{CIERRE.texto}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Boton a={CIERRE.ctaPrincipal.a}>{CIERRE.ctaPrincipal.texto}</Boton>
        <Boton a={CIERRE.ctaSecundario.a} variante="contorno">{CIERRE.ctaSecundario.texto}</Boton>
      </div>
    </div>
  </section>
);

export default CierreCTA;
