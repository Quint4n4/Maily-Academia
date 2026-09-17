import { Outlet } from 'react-router-dom';
import Sidebar, { useSidebarPlegada } from './Sidebar';
import { useSection } from '../../context/SectionContext';
import { useAuth } from '../../context/AuthContext';
import { isCamsa } from '../../theme/camsaTheme';

const MainLayout = () => {
  const { currentSection } = useSection();
  const { user } = useAuth();
  // El tema CAMSA solo aplica a estudiantes; admin e instructor siempre usan el tema estándar
  const isC = user?.role === 'student' && isCamsa(currentSection);

  // El estado vive aqui, no dentro de la barra: este es el componente que tiene
  // que apartar el contenido para dejarle sitio.
  const { plegada, alternar } = useSidebarPlegada();

  return (
    <div
      className={`min-h-screen ${isC ? '' : 'bg-gray-50 dark:bg-gray-900'}`}
      style={isC ? { background: '#0e0e0c', color: '#f5f0e8' } : {}}
    >
      {/* Enlace "saltar al contenido" para usuarios de teclado y lectores de pantalla (WCAG 2.1 AA 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[60] bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Saltar al contenido principal
      </a>

      <Sidebar plegada={plegada} onAlternarPlegado={alternar} />

      {/*
        El hueco de la barra se hace con padding y solo desde `lg`. Por debajo de
        ese ancho la barra flota por encima del contenido, asi que apartarlo
        dejaria una franja vacia en cada telefono.

        El `pt-16` de movil es para el boton de abrir el menu, que va fijo arriba
        a la izquierda y taparia el titulo de la pagina.
      */}
      <main
        id="main-content"
        className={`pt-16 lg:pt-0 transition-[padding] duration-200 ${plegada ? 'lg:pl-[72px]' : 'lg:pl-64'}`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
