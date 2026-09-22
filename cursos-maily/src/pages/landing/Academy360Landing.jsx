import { useEffect, useState } from 'react';

import Academias from './secciones/Academias';
import AreasDeSalud from './secciones/AreasDeSalud';
import CierreCTA from './secciones/CierreCTA';
import Docentes from './secciones/Docentes';
import Encabezado from './secciones/Encabezado';
import Hero from './secciones/Hero';
import PieDePagina from './secciones/PieDePagina';
import SobreLosCursos from './secciones/SobreLosCursos';
import api from '../../services/api';

/**
 * Landing pública de Academy360.
 *
 * Sustituye al hub con tres academias y a las tres landings por academia. Es
 * pública: no asume sesión ni hace ninguna llamada que exija estar dentro.
 *
 * Las academias se piden para la sección de Áreas. Si la llamada falla, la
 * sección cae a su lista fija en vez de desaparecer: una portada a la que le
 * falta un bloque porque la API tardó se ve rota, y quien llega no sabe por
 * qué.
 */
const Academy360Landing = () => {
  const [academias, setAcademias] = useState([]);

  useEffect(() => {
    let vigente = true;

    // Se llama a la API directamente, como hace `SectionContext`: no existe
    // un `sectionService` y crear uno solo para esto seria un segundo sitio
    // donde vive la misma ruta.
    api.get('/sections/')
      .then(({ data }) => {
        if (!vigente) return;
        const lista = data?.results ?? data ?? [];
        // AMBITO>> Solo las que se anuncian en público. Corporativo CAMSA es
        // onboarding interno y no tiene vitrina.
        setAcademias(lista.filter((s) => s.allow_public_preview && s.is_active));
      })
      .catch(() => { /* la sección usa su lista fija */ });

    return () => { vigente = false; };
  }, []);

  return (
    <div className="min-h-screen bg-white font-ui text-academy-tinta">
      <Encabezado />
      <main>
        <Hero />
        <Academias />
        <SobreLosCursos />
        <AreasDeSalud academias={academias} />
        <Docentes />
        <CierreCTA />
      </main>
      <PieDePagina />
    </div>
  );
};

export default Academy360Landing;
