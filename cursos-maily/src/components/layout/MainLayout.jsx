import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useSection } from '../../context/SectionContext';
import { useAuth } from '../../context/AuthContext';
import { isCamsa } from '../../theme/camsaTheme';

const MainLayout = () => {
  const { currentSection } = useSection();
  const { user } = useAuth();
  // El tema CAMSA solo aplica a estudiantes; admin e instructor siempre usan el tema estándar
  const isC = user?.role === 'student' && isCamsa(currentSection);

  return (
    <div
      className={`min-h-screen ${isC ? '' : 'bg-gray-50 dark:bg-gray-900'}`}
      style={isC ? { background: '#0e0e0c', color: '#f5f0e8' } : {}}
    >
      {/* Enlace "saltar al contenido" para usuarios de teclado y lectores de pantalla (WCAG 2.1 AA 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Saltar al contenido principal
      </a>
      <Navbar />
      <main id="main-content" className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
