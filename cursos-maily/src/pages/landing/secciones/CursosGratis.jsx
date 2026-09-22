import { Link } from 'react-router-dom';

import { CURSOS_GRATIS } from '../academy360Config';
import { Foto, TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Cursos gratuitos.
 *
 * De momento pinta huecos con sus medidas. Conectarlo a la API necesita antes
 * un filtro por precio en el backend: `GET /api/courses/` solo filtra por
 * level, status e instructor, y traer 20 y filtrar aqui no garantiza que
 * aparezcan tres gratuitos en la primera pagina.
 */
const CursosGratis = ({ cursos = [] }) => {
  const huecos = Array.from({ length: CURSOS_GRATIS.cuantos });
  const lista = cursos.length ? cursos : huecos;

  return (
    <section id="cursos" className={`bg-white py-16 lg:py-[112px] ${canal} dark:bg-academy-tinta`}>
      <TituloDeSeccion titulo={CURSOS_GRATIS.titulo} subtitulo={CURSOS_GRATIS.subtitulo} />

      <div className="mx-auto grid max-w-[1200px] gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
        {lista.map((curso, indice) => (
          <article key={curso?.id ?? indice} className="flex flex-col">
            <Link to={curso?.id ? `/cursos/${curso.id}` : '/login'} className="block aspect-[4/3] overflow-hidden">
              <Foto
                src={curso?.thumbnail}
                alt={curso?.title ?? ''}
                min={CURSOS_GRATIS.medidaFoto.min}
                etiqueta="Portada del curso"
                className="h-full w-full"
              />
            </Link>
            <h3 className="mt-5 font-display text-a-25 text-academy-tinta lg:text-a-27 dark:text-academy-crema">
              <Link to={curso?.id ? `/cursos/${curso.id}` : '/login'}>
                {curso?.title ?? `[Nombre del curso gratuito ${indice + 1}]`}
              </Link>
            </h3>
            <p className="mt-2 font-ui text-a-15 text-academy-tinta-3 dark:text-white/60">
              <span className="font-medium text-academy-oro-texto dark:text-academy-oro">Gratis</span>
              {' · '}
              {curso?.instructor_name ?? '[Nombre del docente]'}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default CursosGratis;
