import { useState, useRef, useEffect, useMemo } from 'react';
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
  Calendar,
  Gift,
  Bell,
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

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currentSection, availableSections, userSections, setCurrentSection } = useSection();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [showSectionSwitch, setShowSectionSwitch] = useState(false);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const profileRef = useRef(null);
  const sectionSwitchRef = useRef(null);

  // Instructor: fetch Q&A pending count for badge (on mount and when navigating to refresh after answering)
  useEffect(() => {
    if (user?.role !== 'instructor') return;
    let cancelled = false;
    qnaService.getInstructorStats().then((res) => {
      if (!cancelled && res?.questions_pending_count != null) setQnaPendingCount(res.questions_pending_count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.role, location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
      if (sectionSwitchRef.current && !sectionSwitchRef.current.contains(e.target)) {
        setShowSectionSwitch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Navigation items based on role
  const navItems = useMemo(() => {
    switch (user?.role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/admin/users', label: 'Usuarios', icon: Users },
          { to: '/admin/courses', label: 'Cursos', icon: BookOpen },
          { to: '/admin/coupons', label: 'Cupones', icon: Tag },
          { to: '/admin/corporate/benefits', label: 'Corporativo', icon: Gift },
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
        // Navegación específica para el portal corporativo
        if (currentSection === 'corporativo-camsa') {
          return [
            { to: '/corporativo/dashboard', label: 'Inicio', icon: Home },
            { to: '/corporativo/courses', label: 'Cursos', icon: BookOpen },
            { to: '/corporativo/benefits', label: 'Beneficios', icon: Gift },
            { to: '/corporativo/reservations', label: 'Mis Citas', icon: Calendar },
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

  const activeSection = useMemo(() => {
    if (!currentSection) return null;
    return (
      availableSections.find((s) => s.slug === currentSection) || {
        slug: currentSection,
        name: 'Sección actual',
      }
    );
  }, [availableSections, currentSection]);

  // Determina el logo a mostrar según el rol y la academia del usuario
  const logoInfo = useMemo(() => {
    if (user?.role === 'admin') return null;
    if (user?.role === 'instructor') {
      const slug = user?.instructorSection?.slug;
      if (slug === 'maily-academia') return { src: logoMaily, alt: 'Maily Academia', showName: true, bg: false };
      if (slug === 'longevity-360') return { src: logoLongevity, alt: 'Longevity 360', showName: false, bg: false };
      return null;
    }
    // Estudiante: logo según la sección activa
    if (currentSection === 'maily-academia') return { src: logoMaily, alt: 'Maily Academia', showName: true, bg: false };
    if (currentSection === 'corporativo-camsa') return { src: logoCorporativo, alt: 'Corporativo CAMSA', showName: false, bg: true };
    return { src: logoLongevity, alt: 'Longevity 360', showName: false, bg: false };
  }, [user, currentSection]);

  // Secciones disponibles para cambiar (excluye la actual)
  const switchableSections = useMemo(() => {
    if (user?.role !== 'student' || !Array.isArray(userSections) || userSections.length <= 1) return [];
    return userSections
      .map((s) => (typeof s === 'string' ? availableSections.find((x) => x.slug === s) || { slug: s, name: s } : s))
      .filter((s) => s.slug !== currentSection);
  }, [user?.role, userSections, currentSection, availableSections]);

  const handleSectionSwitch = (slug) => {
    setCurrentSection(slug);
    setShowSectionSwitch(false);
    const path = SECTION_DASHBOARD[slug] || '/longevity/dashboard';
    navigate(path, { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const roleBadge = useMemo(() => {
    switch (user?.role) {
      case 'admin': return { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'instructor': return { label: 'Profesor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      default: return null;
    }
  }, [user?.role]);

  // El tema CAMSA solo aplica a estudiantes; admin e instructor usan el tema estándar
  const isC = user?.role === 'student' && isCamsa(currentSection);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-lg border-b ${
      isC
        ? 'bg-[#141311] border-[rgba(77,70,55,0.3)] shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
        : 'bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo según rol y academia */}
          <Link to={navItems[0]?.to || '/dashboard'} className="flex items-center gap-2">
            {logoInfo ? (
              <>
                <div className={`rounded-lg overflow-hidden flex-shrink-0 ${logoInfo.bg ? 'bg-black p-1' : 'bg-white/70 dark:bg-white/10'}`}>
                  <img
                    src={logoInfo.src}
                    alt={logoInfo.alt}
                    className="h-9 w-auto object-contain"
                  />
                </div>
                {logoInfo.showName && (
                  <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                    {logoInfo.alt}
                  </span>
                )}
              </>
            ) : null}
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const showQnaBadge = item.label === 'Q&A' && user?.role === 'instructor' && qnaPendingCount > 0;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isC
                      ? isActive(item.to)
                        ? 'text-[#e6c364] border-b-2 border-[#e6c364]'
                        : 'text-[#d0c5b2] hover:text-[#e6c364] hover:bg-white/5'
                      : isActive(item.to)
                        ? 'bg-maily/10 text-maily dark:text-maily-light'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="relative inline-flex">
                    <Icon size={18} />
                    {showQnaBadge && (
                      <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                        {qnaPendingCount > 99 ? '99+' : qnaPendingCount}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Switcher de academia para alumnos con múltiples secciones */}
            {switchableSections.length > 0 && (
              <div className="relative hidden md:block" ref={sectionSwitchRef}>
                <button
                  onClick={() => setShowSectionSwitch((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-maily transition-colors"
                >
                  <ArrowLeftRight size={14} />
                  <span className="hidden sm:inline">Cambiar academia</span>
                  <ChevronDown size={14} className={`transition-transform ${showSectionSwitch ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showSectionSwitch && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
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
                            {logoData ? (
                              <div className={`flex-shrink-0 rounded-md overflow-hidden ${logoData.bg ? 'bg-black p-1' : ''}`}>
                                <img src={logoData.src} alt={s.name} className="h-7 w-auto object-contain max-w-[80px]" />
                              </div>
                            ) : null}
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.name || s.slug}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            {/* Theme toggle — hidden for CAMSA (always dark) */}
            {!isC && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <img
                  src={user?.avatar}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                  {user?.name}
                </span>
              </button>

              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className={`absolute right-0 mt-2 w-64 rounded-xl shadow-lg border py-2 z-50 ${
                      isC
                        ? 'bg-[#141311] border-[rgba(77,70,55,0.4)]'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className={`px-4 py-3 border-b ${ isC ? 'border-[rgba(77,70,55,0.3)]' : 'border-gray-100 dark:border-gray-700' }`}>
                      <p className={`font-medium ${ isC ? 'text-[#e6c364]' : 'text-gray-900 dark:text-white' }`}>{user?.name}</p>
                      <p className={`text-sm truncate ${ isC ? 'text-[#d0c5b2]' : 'text-gray-500 dark:text-gray-400' }`}>{user?.email}</p>
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
                        isC
                          ? 'text-[#d0c5b2] hover:bg-white/5 hover:text-[#e6c364]'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <User size={16} /> Mi perfil
                    </Link>
                    {switchableSections.length > 0 && (
                      <>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        <p className="px-4 pt-1 pb-0.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                          Cambiar academia
                        </p>
                        {switchableSections.map((s) => {
                          const logoData = SECTION_LOGOS[s.slug];
                          return (
                            <button
                              key={s.slug}
                              onClick={() => { setShowProfile(false); handleSectionSwitch(s.slug); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                            >
                              {logoData ? (
                                <div className={`flex-shrink-0 rounded overflow-hidden ${logoData.bg ? 'bg-black p-0.5' : ''}`}>
                                  <img src={logoData.src} alt={s.name} className="h-5 w-auto object-contain max-w-[60px]" />
                                </div>
                              ) : <ArrowLeftRight size={16} />}
                              <span>{s.name || s.slug}</span>
                            </button>
                          );
                        })}
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                      </>
                    )}
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
                        isC
                          ? 'text-[#e6c364]/70 hover:bg-white/5 hover:text-[#e6c364]'
                          : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                    >
                      <LogOut size={16} /> Cerrar sesión
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobile(!showMobile)}
              className="md:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {showMobile ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      <AnimatePresence>
        {showMobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`md:hidden border-t overflow-hidden ${
              isC
                ? 'bg-[#141311] border-[rgba(77,70,55,0.3)]'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const showQnaBadge = item.label === 'Q&A' && user?.role === 'instructor' && qnaPendingCount > 0;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMobile(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.to)
                        ? 'bg-maily/10 text-maily'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="relative inline-flex">
                      <Icon size={18} />
                      {showQnaBadge && (
                        <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                          {qnaPendingCount > 99 ? '99+' : qnaPendingCount}
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
