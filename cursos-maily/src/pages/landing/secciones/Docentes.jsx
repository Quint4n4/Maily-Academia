import { DOCENTES } from '../academy360Config';
import { Foto, TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Docentes.
 *
 * Estaticos a proposito: no existe endpoint publico de instructores y el
 * modelo `Profile` no tiene campo de especialidad. Se rellenan a mano hasta
 * que el backend pueda darlos.
 */
const Docentes = () => (
  <section id="docentes" className={`bg-academy-crema py-16 lg:py-[112px] ${canal}`}>
    <TituloDeSeccion titulo={DOCENTES.titulo} subtitulo={DOCENTES.subtitulo} />

    <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 lg:grid-cols-4 lg:gap-10">
      {DOCENTES.lista.map((docente, indice) => (
        <article key={indice} className="flex flex-col">
          <div className="aspect-[4/5] overflow-hidden">
            <Foto
              src={docente.foto}
              alt={docente.nombre}
              min={DOCENTES.medidaFoto.min}
              etiqueta="Foto del docente"
              className="h-full w-full"
            />
          </div>
          <h3 className="mt-5 font-display text-a-25 text-academy-tinta">
            {docente.nombre}
          </h3>
          <p className="mt-1 font-ui text-a-15 text-academy-tinta-3">
            {docente.especialidad}
          </p>
        </article>
      ))}
    </div>
  </section>
);

export default Docentes;
