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
  Bell,
  Search,
  Users,
  LayoutDashboard,
  MessageSquare,
  FileText,
  Library,
  CheckCircle,
  Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useSection } from '../../context/SectionContext';
import qnaService from '../../services/qnaService';
import logoMaily from '../../../Logos/logomaily.png';
import logoLongevity from '../../../Logos/Longevity360-03.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currentSection, availableSections, userSections, setCurrentSection } = useSection();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const profileRef = useRef(null);

  // Instructor: fetch Q&A pending count for badge (on mount and when navigating to refresh after answering)
  useEffect(() => {
    if (user?.role !== 'instructor') return;
    let cancelled = false;
    qnaService.getInstructorStats().then((res) => {
      if (!cancelled && res?.questions_pending_count != null) setQnaPendingCount(res.questions_pending_count);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.role, location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
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
        return [
          { to: '/dashboard', label: 'Inicio', icon: Home },
          { to: '/my-courses', label: 'Mis Cursos', icon: Library },
          { to: '/courses', label: 'Cursos', icon: BookOpen },
          { to: '/certificates', label: 'Certificados', icon: Award },
        ];
    }
  }, [user?.role]);

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
      if (slug === 'maily-academia') return { src: logoMaily, alt: 'Maily Academia', showName: true };
      if (slug === 'longevity-360') return { src: logoLongevity, alt: 'Longevity 360', showName: false };
      return null;
    }
    // Estudiante: logo según la sección activa
    if (currentSection === 'maily-academia') return { src: logoMaily, alt: 'Maily Academia', showName: true };
    return { src: logoLongevity, alt: 'Longevity 360', showName: false };
  }, [user, currentSection]);

  const isActive = (path) => location.pathname === path;

  const roleBadge = useMemo(() => {
    switch (user?.role) {
      case 'admin': return { label: 'Admin', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
      case 'instructor': return { label: 'Profesor', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      default: return null;
    }
  }, [user?.role]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo según rol y academia */}
          <Link to={navItems[0]?.to || '/dashboard'} className="flex items-center gap-2">
            {logoInfo ? (
              <>
                <img
                  src={logoInfo.src}
                  alt={logoInfo.alt}
                  className="h-11 w-auto min-w-[2.75rem] rounded-lg object-contain bg-white/70 dark:bg-white/10"
                />
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
                    isActive(item.to)
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
            {/* Selector simple de sección cuando el usuario tiene más de una */}
            {user?.role === 'student' && Array.isArray(userSections) && userSections.length > 1 && (
              <select
                value={currentSection || ''}
                onChange={(e) => {
                  const slug = e.target.value;
                  if (!slug) return;
                  setCurrentSection(slug);
                }}
                className="hidden md:inline-block text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 mr-1"
              >
                {userSections.map((s) => {
                  const section =
                    typeof s === 'string'
                      ? availableSections.find((x) => x.slug === s) || { slug: s, name: s }
                      : s;
                  return (
                    <option key={section.slug} value={section.slug}>
                      {section.name || section.slug}
                    </option>
                  );
                })}
              </select>
            )}
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

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
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
                  >
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      {roleBadge && (
                        <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      )}
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <User size={16} /> Mi perfil
                    </Link>
                    {user?.role === 'student' && Array.isArray(userSections) && userSections.length > 1 && (
                      <Link
                        to="/choose-section"
                        onClick={() => setShowProfile(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <LayoutDashboard size={16} /> Cambiar de sección
                      </Link>
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
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
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
            className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
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
