import Academias from './secciones/Academias';
import CierreCTA from './secciones/CierreCTA';
import Docentes from './secciones/Docentes';
import Encabezado from './secciones/Encabezado';
import Hero from './secciones/Hero';
import InvitacionLongevity from './secciones/InvitacionLongevity';
import PieDePagina from './secciones/PieDePagina';
import SabiasDeTuCuerpo from './secciones/SabiasDeTuCuerpo';

/**
 * Landing pública de Academy360.
 *
 * Sustituye al hub con tres academias y a las tres landings por academia. Es
 * pública: no asume sesión ni hace ninguna llamada que exija estar dentro.
 *
 * De hecho ya no hace NINGUNA llamada. Pedía `/api/sections/` para la sección
 * de Áreas, que era la única que dependía del backend; al sustituirla por la
 * invitación a Longevity 360, la portada pasó a ser estática. Se nota: deja de
 * haber una petición de red antes de poder pintar esa parte, y la portada deja
 * de tener un estado en el que el backend está caído y ella a medias.
 *
 * `SobreLosCursos` sigue en el repo, ya sin usar, por si hay que volver a él.
 * `AreasDeSalud` no: su constante del config desapareció con la sección, y un
 * archivo que dice ser un respaldo pero ya no compila engaña a quien lo
 * encuentre. Está en el historial, que es donde vive lo que se retira.
 */
const Academy360Landing = () => (
  <div className="min-h-screen bg-white font-ui text-academy-tinta">
    <Encabezado />
    <main>
      <Hero />
      <Academias />
      <SabiasDeTuCuerpo />
      <InvitacionLongevity />
      <Docentes />
      <CierreCTA />
    </main>
    <PieDePagina />
  </div>
);

export default Academy360Landing;
