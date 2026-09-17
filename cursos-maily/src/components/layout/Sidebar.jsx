import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Award,
  User,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Users,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Library,
  CheckCircle,
  Video,
  Tag,
  ChevronDown,
  ArrowLeftRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSection } from '../../context/SectionContext';
import { isCamsa } from '../../theme/camsaTheme';
import qnaService from '../../services/qnaService';
import logoMaily from '../../../Logos/logomaily.png';
import logoLongevity from '../../../Logos/Longevity360-03.png';
import logoCorporativo from '../../../Logos/logocorporativo.png';

const SECTION_DASHBOARD = {
  'maily-academia': '/maily/dashboard',
  'longevity-360': '/longevity/dashboard',
  'corporativo-camsa': '/corporativo/dashboard',
};

const SECTION_LOGOS = {
  'maily-academia': { src: logoMaily, bg: false },
  'longevity-360': { src: logoLongevity, bg: false },
  'corporativo-camsa': { src: logoCorporativo, bg: true },
};

const CLAVE_PLEGADO = 'maily:sidebar-plegada';

/**
 * Estado de plegado de la barra. Vive en un hook y no dentro del componente
 * porque `MainLayout` tambien lo necesita: es quien aparta el contenido para
 * dejarle sitio, y si cada uno guardara su copia, al plegar la barra el
 * contenido se quedaria con el hueco de antes.
 *
 * Se recuerda en el navegador: es una preferencia de quien trabaja, no un
 * estado de la pagina.
 */
export const useSidebarPlegada = () => {
  const [plegada, setPlegada] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_PLEGADO) === 'true';
    } catch {
      // Navegador con el almacenamiento bloqueado: se abre desplegada y ya.
      return false;
    }
  });

  const alternar = useCallback(() => {
    setPlegada((v) => {
      const siguiente = !v;
      try {
        localStorage.setItem(CLAVE_PLEGADO, String(siguiente));
      } catch { /* sin persistencia, pero la sesion actual funciona */ }
      return siguiente;
    });
  }, []);

  return { plegada, alternar };
};

/**
 * Menu lateral izquierdo. Sustituye a la barra superior en toda la aplicacion.
 *
 * Tres estados, y conviene distinguirlos:
 *
 *  - Escritorio abierta: 256px, iconos con su etiqueta.
 *  - Escritorio plegada: 72px, solo iconos. La etiqueta aparece al pasar el
 *    raton --un `title` nativo, no un tooltip propio: no hay que mantenerlo y
 *    los lectores de pantalla lo anuncian igual.
 *  - Movil: fuera de pantalla, entra por encima del contenido con un velo
 *    detras. Plegar no tiene sentido en un telefono; ahi se abre o se cierra.
 *
 * Si esta plegada o no se recuerda en el navegador, porque es una preferencia
 * de quien trabaja, no un estado de la pagina: volver a desplegarla en cada
 * recarga es de las cosas que mas molestan de un panel.
 */
const Sidebar = ({ plegada = false, onAlternarPlegado }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currentSection, availableSections, userSections, setCurrentSection } = useSection();
  const location = useLocation();
  const navigate = useNavigate();

  const [abiertaEnMovil, setAbiertaEnMovil] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSectionSwitch, setShowSectionSwitch] = useState(false);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const profileRef = useRef(null);
  const sectionSwitchRef = useRef(null);

  const alternarPlegado = useCallback(() => {
    // Los desplegables se anclan al ancho de la barra: si cambia debajo de
    // ellos quedan flotando en el sitio equivocado.
    setShowProfile(false);
    setShowSectionSwitch(false);
    onAlternarPlegado?.();
  }, [onAlternarPlegado]);

  // Instructor: contador de preguntas pendientes para la insignia de Q&A
  useEffect(() => {
    if (user?.role !== 'instructor') return;
    let cancelled = false;
    qnaService.getInstructorStats().then((res) => {
      if (!cancelled && res?.questions_pending_count != null) {
        setQnaPendingCount(res.questions_pending_count);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.role, location.pathname]);

  // Cerrar los desplegables al pulsar fuera
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (sectionSwitchRef.current && !sectionSwitchRef.current.contains(e.target)) setShowSectionSwitch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navItems = useMemo(() => {
    switch (user?.role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/admin/users', label: 'Usuarios', icon: Users },
          { to: '/admin/courses', label: 'Cursos', icon: BookOpen },
          { to: '/admin/coupons', label: 'Cupones', icon: Tag },
          { to: '/admin/promo-videos', label: 'Videos Maily', icon: Video },
        ];
      case 'instructor':
        return [
          { to: '/instructor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/instructor/courses', label: 'Mis Cursos', icon: BookOpen },
          { to: '/instructor/students', label: 'Mis Alumnos', icon: Users },
          { to: '/instructor/qna', label: 'Q&A', icon: MessageSquare },
          { to: '/instructor/evaluations', label: 'Evaluaciones', icon: CheckCircle },
          { to: '/instructor/blog', label: 'Blog', icon: FileText },
        ];
      default:
        if (currentSection === 'corporativo-camsa') {
          return [
            { to: '/corporativo/dashboard', label: 'Inicio', icon: Home },
            { to: '/corporativo/courses', label: 'Cursos', icon: BookOpen },
            { to: '/corporativo/profile', label: 'Mi Perfil', icon: User },
          ];
        }
        return [
          { to: '/dashboard', label: 'Inicio', icon: Home },
          { to: '/my-courses', label: 'Mis Cursos', icon: Library },
          { to: '/courses', label: 'Cursos', icon: BookOpen },
          { to: '/certificates', label: 'Certificados', icon: Award },
        ];
    }
  }, [user?.role, currentSection]);

  /**
   * Logo y academia de la cabecera.
   *
   * Siempre devuelve algo: antes daba `null` para el administrador y para un
   * instructor sin academia asignada, y esos usuarios se quedaban con la
   * cabecera vacia. El administrador no pertenece a una academia --las ve
   * todas-- asi que lleva la marca de la plataforma y "Administración" debajo.
   */
  const logoInfo = useMemo(() => {
    const POR_SLUG = {
      'maily-academia': { src: logoMaily, academia: 'Maily Academia', bg: false },
      'longevity-360': { src: logoLongevity, academia: 'Longevity 360', bg: false },
      'corporativo-camsa': { src: logoCorporativo, academia: 'Corporativo CAMSA', bg: true },
    };
    const PLATAFORMA = { src: logoMaily, academia: null, bg: false };

    if (user?.role === 'admin') return { ...PLATAFORMA, academia: 'Administración' };
    if (user?.role === 'instructor') {
      return POR_SLUG[user?.instructorSection?.slug] || PLATAFORMA;
    }
    return POR_SLUG[currentSection] || POR_SLUG['longevity-360'];
  }, [user, currentSection]);

  const switchableSections = useMemo(() => {
    if (user?.role !== 'student' || !Array.isArray(userSections) || userSections.length <= 1) return [];
    return userSections
      .map((s) => (typeof s === 'string' ? availableSections.find((x) => x.slug === s) || { slug: s, name: s } : s))
      .filter((s) => s.slug !== currentSection);
  }, [user?.role, userSections, currentSection, availableSections]);

  const handleSectionSwitch = (slug) => {
    setCurrentSection(slug);
    setShowSectionSwitch(false);
    setShowProfile(false);
    navigate(SECTION_DASHBOARD[slug] || '/longevity/dashboard', { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const roleBadge = useMemo(() => {
    switch (user?.role) {
      case 'admin': return { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'instructor': return { label: 'Profesor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      default: return null;
    }
  }, [user?.role]);

  // El tema CAMSA solo aplica a estudiantes; admin e instructor usan el estandar
  const isC = user?.role === 'student' && isCamsa(currentSection);

  const claseEnlace = (activo) => {
    if (isC) {
      return activo
        ? 'bg-[#e6c364]/10 text-[#e6c364]'
        : 'text-[#d0c5b2] hover:text-[#e6c364] hover:bg-white/5';
    }
    return activo
      ? 'bg-maily/10 text-maily dark:text-maily-light'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
  };

  const fondoBarra = isC
    ? 'bg-[#141311] border-[rgba(77,70,55,0.3)]'
    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';

  const contenido = (
    <>
      {/*
        Cabecera: logo y academia, SIEMPRE visibles --tambien plegada.

        El boton de plegar ya no vive aqui. Plegada quedan 48px utiles (72 menos
        el padding) y un logo de 36px mas un boton de 34px no caben: se
        encimaban. En vez de esconder el logo, que es lo que identifica la
        academia, el control se baja al pie junto a los demas.
      */}
      <div className={`flex items-center h-16 px-3 border-b shrink-0 ${plegada ? 'lg:justify-center lg:px-2' : ''} ${isC ? 'border-[rgba(77,70,55,0.3)]' : 'border-gray-200 dark:border-gray-700'}`}>
        <Link
          to={navItems[0]?.to || '/dashboard'}
          className="flex items-center gap-2 min-w-0"
          onClick={() => setAbiertaEnMovil(false)}
          // Plegada no hay sitio para el texto, asi que la academia se dice
          // aqui: el nombre sale al pasar el raton sobre el logo.
          title={plegada ? (logoInfo.academia || 'Maily Academia') : undefined}
        >
          <div className={`rounded-lg overflow-hidden shrink-0 ${logoInfo.bg ? 'bg-black p-1' : 'bg-white/70 dark:bg-white/10'}`}>
            <img src={logoInfo.src} alt="" className="h-9 w-auto object-contain" />
          </div>

          {/* El nombre se oculta con `lg:hidden` y no con un `!plegada &&`:
              `plegada` es un estado de escritorio, y en el movil la barra se
              abre entera aunque en el escritorio se hubiera dejado plegada. */}
          <span className={`min-w-0 ${plegada ? 'lg:hidden' : ''}`}>
            <span className={`block text-base font-bold leading-tight truncate ${isC ? 'text-[#e6c364]' : 'text-gray-900 dark:text-white'}`}>
              {logoInfo.academia || 'Maily Academia'}
            </span>
            {logoInfo.academia && logoInfo.academia !== 'Administración' && (
              <span className={`block text-[11px] leading-tight truncate ${isC ? 'text-[#d0c5b2]' : 'text-gray-500 dark:text-gray-400'}`}>
                Academia activa
              </span>
            )}
          </span>
        </Link>

        {/* Cerrar: solo en movil */}
        <button
          onClick={() => setAbiertaEnMovil(false)}
          aria-label="Cerrar el menú"
          className={`lg:hidden ml-auto p-2 rounded-lg shrink-0 ${isC ? 'text-[#d0c5b2] hover:bg-white/5' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <X size={20} />
        </button>
      </div>

      {/* Navegacion */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1" aria-label="Navegación principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const activo = isActive(item.to);
          const insignia = item.label === 'Q&A' && user?.role === 'instructor' && qnaPendingCount > 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              // En movil la barra tapa el contenido: si no se cierra al navegar,
              // el usuario aterriza en la pagina nueva sin verla. Se hace aqui y
              // no en un efecto sobre la ruta, que provoca un render de mas.
              onClick={() => setAbiertaEnMovil(false)}
              title={plegada ? item.label : undefined}
              aria-current={activo ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                plegada ? 'lg:justify-center lg:px-2 px-3' : 'px-3'
              } py-2.5 ${claseEnlace(activo)}`}
            >
              <span className="relative inline-flex shrink-0">
                <Icon size={20} />
                {insignia && (
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {qnaPendingCount > 99 ? '99+' : qnaPendingCount}
                  </span>
                )}
              </span>
              <span className={plegada ? 'lg:hidden' : ''}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie: plegar, cambiar academia, tema y perfil */}
      <div className={`border-t p-2 space-y-1 shrink-0 ${isC ? 'border-[rgba(77,70,55,0.3)]' : 'border-gray-200 dark:border-gray-700'}`}>
        {/* Plegar: solo en escritorio. En movil la barra se abre o se cierra. */}
        <button
          onClick={alternarPlegado}
          aria-label={plegada ? 'Desplegar el menú' : 'Plegar el menú'}
          title={plegada ? 'Desplegar el menú' : undefined}
          className={`hidden lg:flex w-full items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
            plegada ? 'justify-center px-2' : 'px-3'
          } py-2.5 ${claseEnlace(false)}`}
        >
          {plegada
            ? <PanelLeftOpen size={20} className="shrink-0" />
            : <PanelLeftClose size={20} className="shrink-0" />}
          <span className={plegada ? 'hidden' : ''}>Plegar menú</span>
        </button>

        {switchableSections.length > 0 && (
          <div className="relative" ref={sectionSwitchRef}>
            <button
              onClick={() => setShowSectionSwitch((v) => !v)}
              title={plegada ? 'Cambiar academia' : undefined}
              aria-expanded={showSectionSwitch}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                plegada ? 'lg:justify-center lg:px-2 px-3' : 'px-3'
              } py-2.5 ${claseEnlace(false)}`}
            >
              <ArrowLeftRight size={20} className="shrink-0" />
              <span className={plegada ? 'lg:hidden' : 'flex-1 text-left'}>Cambiar academia</span>
              <ChevronDown size={16} className={`shrink-0 transition-transform ${plegada ? 'lg:hidden' : ''} ${showSectionSwitch ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showSectionSwitch && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                >
                  <p className="px-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    Ir a otra academia
                  </p>
                  {switchableSections.map((s) => {
                    const logoData = SECTION_LOGOS[s.slug];
                    return (
                      <button
                        key={s.slug}
                        onClick={() => handleSectionSwitch(s.slug)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        {logoData && (
                          <div className={`shrink-0 rounded-md overflow-hidden ${logoData.bg ? 'bg-black p-1' : ''}`}>
                            <img src={logoData.src} alt="" className="h-7 w-auto object-contain max-w-[80px]" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name || s.slug}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CAMSA va siempre en oscuro: ahi el conmutador no pinta nada */}
        {!isC && (
          <button
            onClick={toggleTheme}
            title={plegada ? (isDark ? 'Tema claro' : 'Tema oscuro') : undefined}
            aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
              plegada ? 'lg:justify-center lg:px-2 px-3' : 'px-3'
            } py-2.5 ${claseEnlace(false)}`}
          >
            {isDark ? <Sun size={20} className="shrink-0" /> : <Moon size={20} className="shrink-0" />}
            <span className={plegada ? 'lg:hidden' : ''}>{isDark ? 'Tema claro' : 'Tema oscuro'}</span>
          </button>
        )}

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile((v) => !v)}
            title={plegada ? user?.name : undefined}
            aria-expanded={showProfile}
            className={`w-full flex items-center gap-3 rounded-lg transition-colors ${
              plegada ? 'lg:justify-center lg:px-2 px-3' : 'px-3'
            } py-2 ${claseEnlace(false)}`}
          >
            <img src={user?.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            <span className={`min-w-0 text-left ${plegada ? 'lg:hidden' : 'flex-1'}`}>
              <span className="block text-sm font-medium truncate">{user?.name}</span>
              {roleBadge && (
                <span className="block text-xs opacity-70 truncate">{roleBadge.label}</span>
              )}
            </span>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`absolute bottom-full left-0 mb-2 w-64 rounded-xl shadow-lg border py-2 z-50 ${
                  isC ? 'bg-[#141311] border-[rgba(77,70,55,0.4)]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className={`px-4 py-3 border-b ${isC ? 'border-[rgba(77,70,55,0.3)]' : 'border-gray-100 dark:border-gray-700'}`}>
                  <p className={`font-medium truncate ${isC ? 'text-[#e6c364]' : 'text-gray-900 dark:text-white'}`}>{user?.name}</p>
                  <p className={`text-sm truncate ${isC ? 'text-[#d0c5b2]' : 'text-gray-500 dark:text-gray-400'}`}>{user?.email}</p>
                  {roleBadge && (
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  )}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setShowProfile(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    isC ? 'text-[#d0c5b2] hover:bg-white/5 hover:text-[#e6c364]' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <User size={16} /> Mi perfil
                </Link>
                {user?.role === 'student' && (
                  <Link
                    to="/certificates"
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Award size={16} /> Mis certificados
                  </Link>
                )}
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left ${
                    isC ? 'text-[#e6c364]/70 hover:bg-white/5 hover:text-[#e6c364]' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Movil: boton para abrir. Se queda fijo arriba a la izquierda. */}
      <button
        onClick={() => setAbiertaEnMovil(true)}
        aria-label="Abrir el menú"
        aria-expanded={abiertaEnMovil}
        className={`lg:hidden fixed top-3 left-3 z-40 p-2.5 rounded-lg border shadow-sm ${
          isC ? 'bg-[#141311] border-[rgba(77,70,55,0.3)] text-[#e6c364]' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
        }`}
      >
        <Menu size={20} />
      </button>

      {/* Escritorio: fija a la izquierda */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 z-40 flex-col border-r transition-[width] duration-200 ${fondoBarra} ${
          plegada ? 'w-[72px]' : 'w-64'
        }`}
      >
        {contenido}
      </aside>

      {/* Movil: por encima del contenido, con velo detras */}
      <AnimatePresence>
        {abiertaEnMovil && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAbiertaEnMovil(false)}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r ${fondoBarra}`}
            >
              {contenido}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
