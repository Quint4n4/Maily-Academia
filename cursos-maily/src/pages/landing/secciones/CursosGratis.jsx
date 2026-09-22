import { Link } from 'react-router-dom';

import { CURSOS_GRATIS } from '../academy360Config';
import { Boton, Foto, TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Cursos gratuitos, leídos de la API.
 *
 * Tres estados y no uno: cargando, con cursos, y vacío. El diseño solo dibuja
 * el del medio -- tres tarjetas llenas -- pero los otros dos ocurren de
 * verdad: la primera visita siempre pasa por el de carga, y el vacío aparece
 * en cuanto no haya ningún curso gratuito publicado en una academia con
 * vitrina.
 *
 * Una portada pública que ofrece "empieza gratis" y enseña tres huecos grises
 * es peor que una que dice con palabras que todavía no hay cursos abiertos.
 */
const CursosGratis = ({ cursos = [], cargando = false }) => {
  const hayCursos = cursos.length > 0;

  return (
    <section id="cursos" className={`bg-white py-16 lg:py-[112px] ${canal} dark:bg-academy-tinta`}>
      <TituloDeSeccion titulo={CURSOS_GRATIS.titulo} subtitulo={CURSOS_GRATIS.subtitulo} />

      {cargando && (
        <div
          className="mx-auto grid max-w-[1200px] gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10"
          aria-busy="true"
          aria-live="polite"
        >
          {Array.from({ length: CURSOS_GRATIS.cuantos }).map((_, indice) => (
            <div key={indice} className="animate-pulse">
              <div className="aspect-[4/3] w-full bg-academy-crema-2 dark:bg-white/5" />
              <div className="mt-5 h-6 w-4/5 bg-academy-crema-2 dark:bg-white/5" />
              <div className="mt-3 h-4 w-2/5 bg-academy-crema-2 dark:bg-white/5" />
            </div>
          ))}
        </div>
      )}

      {!cargando && hayCursos && (
        <div className="mx-auto grid max-w-[1200px] gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {cursos.map((curso) => (
            <article key={curso.id} className="flex flex-col">
              <Link to="/login" className="block aspect-[4/3] overflow-hidden">
                <Foto
                  src={curso.thumbnail}
                  alt={curso.title}
                  min={CURSOS_GRATIS.medidaFoto.min}
                  etiqueta="Portada del curso"
                  className="h-full w-full"
                />
              </Link>
              <h3 className="mt-5 font-display text-a-25 text-academy-tinta lg:text-a-27 dark:text-academy-crema">
                {/* Lleva al login y no a la ficha: el catálogo interno exige
                    sesión, y mandar a alguien a una pantalla que le va a
                    rebotar es peor que pedirle que entre primero. */}
                <Link to="/login">{curso.title}</Link>
              </h3>
              <p className="mt-2 font-ui text-a-15 text-academy-tinta-3 dark:text-white/60">
                <span className="font-medium text-academy-oro-texto dark:text-academy-oro">Gratis</span>
                {curso.instructor_name ? ` · ${curso.instructor_name}` : ''}
              </p>
            </article>
          ))}
        </div>
      )}

      {!cargando && !hayCursos && (
        <div className="mx-auto max-w-[520px] text-center">
          <p className="font-ui text-a-17 text-academy-tinta-2 dark:text-white/70">
            Todavía no hay cursos gratuitos abiertos. Crea tu cuenta y te avisamos
            en cuanto publiquemos el primero.
          </p>
          <div className="mt-7 flex justify-center">
            <Boton a="/login">Crear mi cuenta</Boton>
          </div>
        </div>
      )}
    </section>
  );
};

export default CursosGratis;
