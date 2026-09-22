import { SOBRE_LOS_CURSOS as S } from '../academy360Config';
import { Boton, Eyebrow, Foto } from './Piezas';

/** Banda partida: foto a la izquierda, texto sobre crema a la derecha. */
const SobreLosCursos = () => (
  <section className="grid lg:min-h-[580px] lg:grid-cols-2">
    <div className="h-[260px] lg:h-auto">
      <Foto src={S.foto.src} alt={S.foto.alt} min={S.foto.min} etiqueta="Foto de apoyo" className="h-full w-full" />
    </div>

    <div className="flex flex-col justify-center bg-academy-crema px-6 py-14 sm:px-10 lg:px-[88px] lg:py-0 dark:bg-white/5">
      <Eyebrow>{S.eyebrow}</Eyebrow>
      <h2 className="mt-6 font-display text-a-32 leading-[1.1] text-academy-tinta sm:text-a-46 lg:text-a-50 dark:text-academy-crema">
        {S.titulo}
        <br />
        {S.tituloSegundaLinea}
      </h2>
      <p className="mt-6 max-w-[460px] font-ui text-a-17 leading-[1.7] text-academy-tinta-2 dark:text-white/70">
        {S.texto}
      </p>
      <div className="mt-9">
        <Boton a={S.cta.a}>{S.cta.texto}</Boton>
      </div>
    </div>
  </section>
);

export default SobreLosCursos;
