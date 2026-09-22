import { AREAS } from '../academy360Config';
import { TituloDeSeccion } from './Piezas';
import { canal } from './estilos';

/**
 * Areas de salud.
 *
 * Con `origen: 'academias-con-vitrina'` las tarjetas son las academias que se
 * anuncian en publico. Corporativo CAMSA es onboarding interno de empleados y
 * no tiene vitrina, asi que no aparece: anunciar en la portada una academia a
 * la que nadie de fuera puede entrar es prometer algo que no se cumple.
 */
const AreasDeSalud = ({ academias = [] }) => {
  const tarjetas = AREAS.origen === 'academias-con-vitrina'
    ? academias.map((a) => ({ nombre: a.name, texto: a.description ?? '' }))
    : AREAS.fijas;

  const lista = tarjetas.length ? tarjetas : AREAS.fijas;

  return (
    <section id="areas" className={`bg-white py-16 lg:py-[112px] ${canal}`}>
      <TituloDeSeccion titulo={AREAS.titulo} subtitulo={AREAS.subtitulo} />

      <div className="mx-auto grid max-w-[1200px] gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-0">
        {lista.map((area, indice) => (
          <article
            key={area.nombre}
            className={`lg:px-10 ${indice > 0 ? 'lg:border-l lg:border-academy-linea' : ''} ${indice === 0 ? 'lg:pl-0' : ''}`}
          >
            <p className="font-display text-a-44 leading-none text-academy-oro-texto">
              {String(indice + 1).padStart(2, '0')}
            </p>
            <h3 className="mt-4 font-display text-a-28 text-academy-tinta">
              {area.nombre}
            </h3>
            <p className="mt-3 font-ui text-a-15 leading-[1.7] text-academy-tinta-3">
              {area.texto}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default AreasDeSalud;
