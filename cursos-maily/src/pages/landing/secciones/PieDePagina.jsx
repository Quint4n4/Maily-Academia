import { Link } from 'react-router-dom';

import { MARCA, PIE } from '../academy360Config';
import { canal } from './estilos';

const PieDePagina = () => (
  <footer className={`flex flex-col items-center justify-between gap-6 border-t border-academy-linea bg-white py-8 lg:flex-row ${canal}`}>
    <div className="flex items-center gap-3">
      <img src={MARCA.logo} alt="" className="h-14 w-14" />
      <p className="font-ui text-a-13 text-academy-tinta-3">
        © {MARCA.anio} {MARCA.nombre}
      </p>
    </div>

    <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2" aria-label="Pie de página">
      {PIE.map((enlace) => {
        const clases = 'font-ui text-a-13 text-academy-tinta-3 hover:text-academy-tinta';
        // Un enlace sin destino se pinta como texto, no como enlace muerto: el
        // aviso de privacidad todavia no existe como pagina.
        if (!enlace.a) {
          return <span key={enlace.texto} className="font-ui text-a-13 text-academy-tinta-3/50">{enlace.texto}</span>;
        }
        if (enlace.a.startsWith('#')) {
          return <a key={enlace.texto} href={enlace.a} className={clases}>{enlace.texto}</a>;
        }
        return <Link key={enlace.texto} to={enlace.a} className={clases}>{enlace.texto}</Link>;
      })}
    </nav>
  </footer>
);

export default PieDePagina;
