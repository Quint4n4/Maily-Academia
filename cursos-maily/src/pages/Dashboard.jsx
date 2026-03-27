import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Clock, Award, TrendingUp, Play, ChevronRight, Flame, Video, X, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useSection } from '../context/SectionContext';
import { isCamsa } from '../theme/camsaTheme';
import { Card, ProgressBar, Badge } from '../components/ui';
import { SkeletonStatCard, SkeletonCard } from '../components/ui/SkeletonLoader';
import courseService from '../services/courseService';
import api from '../services/api';
import logoMaily from '../../Logos/logomaily.png';
import logoCorporativo from '../../Logos/logocorporativo.png';
import logoLongevity from '../../Logos/Longevity360-03.png';

function toEmbedUrl(raw = '') {
  const url = raw.trim();
  if (!url) return url;
  if (url.includes('youtube.com/embed/')) return url;
  const watchMatch = url.match(/youtube\.com\/watch.*[?&]v=([^&\s]+)/);
  if (watchMatch) return 'https://www.youtube.com/embed/' + watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([^?\s]+)/);
  if (shortMatch) return 'https://www.youtube.com/embed/' + shortMatch[1];
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?\s]+)/);
  if (shortsMatch) return 'https://www.youtube.com/embed/' + shortsMatch[1];
  const vimeoMatch = url.match(/vimeo\.com\/([0-9]+)/);
  if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1];
  return url;
}

const Dashboard = () => {
  const { user } = useAuth();
  const { currentSection } = useSection();
  const { loadDashboard, loadCertificates } = useProgress();
  const [dashData, setDashData] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Maily Soft presentation modal
  const [showMailyModal, setShowMailyModal] = useState(false);
  const [mailyVideos, setMailyVideos] = useState([]);
  const [mailyVideosLoading, setMailyVideosLoading] = useState(false);

  useEffect(() => {
    if (!currentSection) return;
    const load = async () => {
      try {
        const [dash, coursesRes] = await Promise.all([
          loadDashboard(),
          courseService.listBySection(currentSection),
        ]);
        setDashData(dash);
        const courses = coursesRes.results || coursesRes || [];
        setAllCourses(Array.isArray(courses) ? courses : []);

        if (user?.role === 'student') {
          try {
            const recRes = await courseService.getRecommended(currentSection);
            setRecommendedCourses((recRes.results || recRes) ?? []);
          } catch {
            setRecommendedCourses([]);
          }
        } else {
          setRecommendedCourses([]);
        }
        await loadCertificates();
      } catch {
        setRecommendedCourses([]);
      }
      setLoading(false);
    };
    load();
  }, [user?.role, currentSection]);

  // Load Maily promo videos when modal is opened (longevity section only)
  useEffect(() => {
    if (!showMailyModal || mailyVideos.length > 0) return;
    setMailyVideosLoading(true);
    api
      .get('/sections/maily-academia/promo-videos/')
      .then((res) => {
        const data = res.data;
        const raw = data?.results ?? data?.promo_videos ?? data;
        setMailyVideos(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setMailyVideos([]))
      .finally(() => setMailyVideosLoading(false));
  }, [showMailyModal]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="font-plus-jakarta-sans min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 px-4 sm:px-6 lg:px-8 py-8">
          {/* Skeleton del hero */}
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-64 sm:h-80 w-full" />
          {/* Skeleton de tarjetas de estadísticas */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatCard key={i} />
            ))}
          </section>
          {/* Skeleton de cursos recomendados */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </section>
        </div>
      </div>
    );
  }

  const stats = {
    coursesStarted: dashData?.enrolled_courses || 0,
    coursesCompleted: dashData?.completed_courses || 0,
    totalCertificates: dashData?.certificates_earned || 0,
    totalLessonsCompleted: dashData?.total_lessons_completed || 0,
  };

  const coursesInProgress = (dashData?.courses || []).filter(
    (c) => c.progress_percent > 0 && c.progress_percent < 100
  );

  const statCards = [
    { icon: BookOpen, label: 'Cursos iniciados', value: stats.coursesStarted, color: 'bg-blue-500', lightColor: 'bg-blue-100' },
    { icon: Award, label: 'Certificados', value: stats.totalCertificates, color: 'bg-yellow-500', lightColor: 'bg-yellow-100' },
    { icon: TrendingUp, label: 'Completados', value: stats.coursesCompleted, color: 'bg-green-500', lightColor: 'bg-green-100' },
    { icon: Flame, label: 'Lecciones hechas', value: stats.totalLessonsCompleted, color: 'bg-orange-500', lightColor: 'bg-orange-100' },
  ];

  const isC = isCamsa(currentSection);

  return (
    <>
    <div className="font-plus-jakarta-sans min-h-screen">
      {/* Content Canvas */}
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 animate-fade-in px-4 sm:px-6 lg:px-8 py-8">
          
        {/* Hero Welcome Section */}
        <section className={`relative rounded-2xl overflow-hidden p-8 sm:p-12 text-white min-h-[280px] sm:min-h-[320px] flex items-center shadow-xl ${
          isC
            ? 'bg-[#141311] border border-[rgba(201,168,76,0.15)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]'
            : 'bg-stitch-primary shadow-stitch-primary/10'
        }`}>
          {isC ? (
            /* CAMSA gold glow decoration */
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-25 pointer-events-none"
              style={{ background: 'linear-gradient(to left, #c9a84c, transparent)' }} />
          ) : (
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          )}
          <div className="relative z-10 max-w-2xl">
            <span className={`px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 inline-block shadow-sm ${
              isC ? 'bg-[rgba(201,168,76,0.15)] text-[#e6c364] border border-[rgba(201,168,76,0.2)]' : 'bg-primary-container text-on-primary-container'
            }`}>Dashboard Estudiante</span>
            <h2 className={`text-3xl sm:text-5xl font-extrabold tracking-tight mb-4 ${ isC ? 'text-[#e6c364]' : '' }`}>¡Hola, {user?.firstName || user?.name?.split(' ')[0]}!</h2>
            <p className={`text-base sm:text-lg opacity-90 leading-relaxed font-medium ${ isC ? 'text-[#d0c5b2]' : '' }`}>
              {coursesInProgress.length > 0
                ? `Has completado un ${coursesInProgress[0].progress_percent}% de tu curso activo. Tu enfoque en "${coursesInProgress[0].course_title}" está dando frutos — ¡sigue así!`
                : 'Explora nuevos cursos y continúa tu camino de aprendizaje e innovación hoy mismo.'
              }
            </p>
            <div className="mt-8 flex gap-4">
              <Link
                to={coursesInProgress.length > 0 && coursesInProgress[0].resume_at ? `/course/${coursesInProgress[0].course_id}/lesson/${coursesInProgress[0].resume_at.module_id}/${coursesInProgress[0].resume_at.lesson_id}` : '/cursos'}
                className={`px-6 sm:px-8 py-3.5 rounded-full font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg ${
                  isC
                    ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c]'
                    : 'bg-primary-container text-on-primary-container shadow-stitch-primary/20'
                }`}
              >
                {coursesInProgress.length > 0 ? 'Reanudar curso' : 'Ver catálogo'}
                <span className="material-symbols-outlined text-sm sm:text-base">play_arrow</span>
              </Link>
            </div>
          </div>
          {/* Decorative Image — hidden for CAMSA */}
          {!isC && (
            <div className="absolute right-0 bottom-0 top-0 w-[40%] hidden lg:block">
              <img className="w-full h-full object-cover opacity-50 mix-blend-overlay" alt="Estudiantes emocionados" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuOt_hXMhsNZrb3YrAO8u8kSxHXRbA9Y23oNeZQw7805rxdg39A5aQiNWri7XKWSwZNgCf0VHGv565qCcrvNO-twCIQUyfEEevGMax7eRFdu8HSG9e7SuO-JhL2p5ahgM94F9HDZv5gxA_RhwN_YaD5oJmH4tCLyOSi0PF-ieXFY4j3GXdrAbJvg7tGCUHAO77xDcu7jgKyYPN0IuDpeQyGCUJuArSWEzJKeFKmMuO80HR_dAjCoqFeYp6fXJPD_flQqggnvWi9KcQ" />
            </div>
          )}
        </section>

        {/* Maily Soft Promo Banner — only for Longevity 360 users */}
        {currentSection === 'longevity-360' && (
          <section>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d2044] to-[#0f2a58] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl border border-blue-900/30"
            >
              {/* Background glow */}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(99,179,237,0.08) 0%, transparent 60%)' }} />
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                <div className="flex-shrink-0 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <img src={logoMaily} alt="Maily Academia" className="h-12 w-auto object-contain" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 mb-2 block">Software Empresarial</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">Conoce Maily Academia</h3>
                  <p className="text-sm text-blue-200/80 mt-1 max-w-md">Descubre el ecosistema de software educativo que potencia tu plataforma de aprendizaje.</p>
                </div>
              </div>
              <button
                onClick={() => setShowMailyModal(true)}
                className="relative z-10 flex-shrink-0 flex items-center gap-2 bg-white text-[#0a1628] px-6 py-3 rounded-full font-bold text-sm hover:bg-blue-50 hover:scale-105 transition-all shadow-lg shadow-blue-900/30"
              >
                <Play className="w-4 h-4" />
                Ver presentación
              </button>
            </motion.div>
          </section>
        )}
          
        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: 'menu_book', label: 'En Curso', value: stats.coursesStarted < 10 && stats.coursesStarted > 0 ? `0${stats.coursesStarted}` : stats.coursesStarted, sub: 'Cursos activos' },
            { icon: 'workspace_premium', label: 'Certificados', value: stats.totalCertificates < 10 && stats.totalCertificates > 0 ? `0${stats.totalCertificates}` : stats.totalCertificates, sub: 'Obtenidos a la fecha' },
            { icon: 'task_alt', label: 'Lecciones', value: stats.totalLessonsCompleted, sub: 'Tareas completadas' },
            { icon: 'check_circle', label: 'Completados', value: stats.coursesCompleted < 10 && stats.coursesCompleted > 0 ? `0${stats.coursesCompleted}` : stats.coursesCompleted, sub: 'Finalizados en su totalidad' },
          ].map((s) => (
            <div key={s.label} className={`p-6 sm:p-8 rounded-2xl flex flex-col justify-between hover:-translate-y-1 transition-transform group ${
              isC
                ? 'bg-[#1f1f1c] border border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.3)]'
                : 'bg-surface-container-lowest shadow-[0_40px_40px_-10px_rgba(27,28,25,0.04)] border border-outline-variant/20'
            }`}>
              <div>
                <span className={`material-symbols-outlined mb-4 p-3 rounded-2xl group-hover:scale-110 transition-transform w-[48px] h-[48px] flex items-center justify-center ${
                  isC ? 'text-[#e6c364] bg-[rgba(201,168,76,0.1)]' : 'text-stitch-primary bg-primary-fixed'
                }`}>{s.icon}</span>
                <p className={`font-bold uppercase tracking-widest text-[10px] sm:text-xs ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant' }`}>{s.label}</p>
              </div>
              <div className="mt-4">
                <h3 className={`text-3xl sm:text-4xl font-black leading-none mb-1 ${ isC ? 'text-[#e6c364]' : 'text-on-background' }`}>{s.value}</h3>
                <p className={`text-xs ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/80' }`}>{s.sub}</p>
              </div>
            </div>
          ))}
        </section>
          
        {/* Accesos rápidos del alumno */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { to: '/mis-pagos', icon: <CreditCard size={22} />, label: 'Historial de pagos', sub: 'Recibos y facturas', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', iconColor: 'text-indigo-600 dark:text-indigo-400' },
            { to: '/certificates', icon: <Award size={22} />, label: 'Mis certificados', sub: 'Logros obtenidos', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30', iconColor: 'text-yellow-600 dark:text-yellow-400' },
            { to: '/my-courses', icon: <BookOpen size={22} />, label: 'Mis cursos', sub: 'Continúa aprendiendo', iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`group p-5 rounded-2xl border flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
                isC
                  ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.3)]'
                  : 'bg-surface-container-lowest border-outline-variant/20'
              }`}
            >
              <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform ${
                isC ? 'bg-[rgba(201,168,76,0.1)]' : item.iconBg
              }`}>
                <span className={isC ? 'text-[#e6c364]' : item.iconColor}>{item.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface' }`}>{item.label}</p>
                <p className={`text-xs mt-0.5 ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/70' }`}>{item.sub}</p>
              </div>
              <ChevronRight size={16} className={`group-hover:translate-x-1 transition-transform ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/50' }`} />
            </Link>
          ))}
        </section>

        {/* Main Interactive Section: Recommendations & Progress */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-10">
            
          {/* Recommendations */}
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h3 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>Recomendados para ti</h3>
                <p className={`text-sm sm:text-base opacity-80 mt-1 ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant' }`}>Sugerencias basadas en tus intereses</p>
              </div>
              <Link to="/cursos" className={`text-xs sm:text-sm font-bold uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all ${
                isC ? 'text-[#c9a84c]' : 'text-stitch-primary'
              }`}>Ver todos <span className="material-symbols-outlined text-sm">arrow_forward</span></Link>
            </div>
            
            {user?.role === 'student' && !user?.hasCompletedSurvey && (
              <div className={`p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border ${
                isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest border-outline-variant/30'
              }`}>
                <div className="flex items-center gap-4">
                  <span className={`material-symbols-outlined text-4xl ${ isC ? 'text-[#e6c364]' : 'text-stitch-primary' }`}>auto_awesome</span>
                  <div>
                    <h4 className={`font-bold text-lg ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface' }`}>Personaliza tus recomendaciones</h4>
                    <p className={`text-sm mt-1 ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant' }`}>Responde una encuesta rápida para descubrir contenido a tu medida.</p>
                  </div>
                </div>
                <Link to="/survey" className={`px-6 py-2.5 rounded-full font-bold text-sm w-full sm:w-auto text-center transition-colors ${
                  isC ? 'bg-[#c9a84c]/20 text-[#e6c364] hover:bg-[#c9a84c]/30' : 'bg-primary-container text-on-primary-container hover:bg-inverse-primary'
                }`}>Empezar test</Link>
              </div>
            )}

            {recommendedCourses.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {recommendedCourses.slice(0, 4).map((course) => (
                  <Link key={course.id} to={`/course/${course.id}`} className={`group rounded-2xl overflow-hidden border hover:shadow-xl transition-all duration-300 flex flex-col ${
                    isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] hover:border-[rgba(230,195,100,0.35)]' : 'bg-surface-container-lowest border-outline-variant/20'
                  }`}>
                    <div className="h-40 sm:h-48 overflow-hidden relative">
                      <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={course.title} src={course.thumbnail} />
                      <span className={`absolute top-4 left-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm ${
                        isC
                          ? 'bg-[#141311] text-[#e6c364] border border-[rgba(230,195,100,0.2)]'
                          : course.level === 'beginner' ? 'bg-tertiary-container text-on-tertiary-container' : course.level === 'intermediate' ? 'bg-primary-container text-on-primary-container' : 'bg-red-100 text-red-900'
                      }`}>
                        {course.level === 'beginner' ? 'Principiante' : course.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className={`font-bold text-lg sm:text-xl leading-tight mb-2 line-clamp-2 transition-colors ${
                          isC ? 'text-[#f5f0e8] group-hover:text-[#e6c364]' : 'text-on-surface group-hover:text-stitch-primary'
                        }`}>{course.title}</h4>
                        <p className={`text-xs mb-4 line-clamp-2 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant/80' }`}>{course.description}</p>
                      </div>
                      <div className={`flex items-center justify-between text-xs font-bold mt-auto pt-4 border-t ${
                        isC ? 'text-[#8a8578] border-[rgba(77,70,55,0.2)]' : 'text-on-surface-variant border-surface-container'
                      }`}>
                        <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">schedule</span> {course.duration}</span>
                        <span className={`flex items-center gap-1.5 ${
                          isC
                            ? (!course.price || Number(course.price) === 0) ? 'text-[#c9a84c]' : 'text-[#e6c364]'
                            : (!course.price || Number(course.price) === 0) ? 'text-green-600' : 'text-stitch-primary'
                        }`}>
                          {(!course.price || Number(course.price) === 0) ? 'GRATIS' : `$${Number(course.price).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
            
          {/* Overall Progress Widget */}
          <div className={`px-6 py-10 rounded-3xl flex flex-col items-center justify-center text-center space-y-6 ${
            isC ? 'bg-[#1f1f1c] border border-[rgba(77,70,55,0.3)]' : 'bg-surface-container shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]'
          }`}>
            <h3 className={`text-xl sm:text-2xl font-extrabold tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>Tu progreso general</h3>
            {(() => {
              const pPercent = allCourses.length > 0 ? Math.round((stats.coursesCompleted / allCourses.length) * 100) : 0;
              const radius = 90;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (pPercent / 100) * circumference;
              
              return (
                <div className="relative flex items-center justify-center w-56 h-56">
                  <svg className="w-full h-full -rotate-90 filter drop-shadow-sm">
                    <circle className={isC ? "text-[rgba(77,70,55,0.5)]" : "text-outline-variant/30"} cx="112" cy="112" fill="transparent" r={radius} stroke="currentColor" strokeWidth="16"></circle>
                    <circle 
                      className={isC ? "text-[#c9a84c]" : "text-stitch-primary"} 
                      cx="112" cy="112" 
                      fill="transparent" 
                      r={radius} 
                      stroke="currentColor" 
                      strokeDasharray={circumference} 
                      strokeDashoffset={offset} 
                      strokeWidth="16" 
                      strokeLinecap="round" 
                      style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                    ></circle>
                  </svg>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center m-4 rounded-full border ${
                    isC
                      ? 'bg-[#141311] border-[rgba(230,195,100,0.15)] shadow-[inset_0_0_20px_rgba(201,168,76,0.1)]'
                      : 'bg-surface-container-lowest shadow-sm border-outline-variant/10'
                  }`}>
                    <span className={`text-4xl sm:text-5xl font-black tracking-tighter ${ isC ? 'text-[#e6c364]' : 'text-on-surface' }`}>{pPercent}%</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/60' }`}>Completado</span>
                  </div>
                </div>
              );
            })()}
            
            <div className="w-full max-w-[240px] space-y-4">
              <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-widest px-2 ${ isC ? 'text-[#d0c5b2]' : 'text-on-surface-variant' }`}>
                <span>Completados</span>
                <span>{stats.coursesCompleted} / {allCourses.length}</span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden flex ${ isC ? 'bg-[#141311] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' : 'bg-surface-container-highest shadow-inner' }`}>
                <div className={`h-full rounded-full relative overflow-hidden ${ isC ? 'bg-[#c9a84c]' : 'bg-stitch-primary' }`} style={{ width: `${allCourses.length > 0 ? (stats.coursesCompleted / allCourses.length) * 100 : 0}%`, transition: 'width 1.5s ease-in-out' }}>
                  <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20"></div>
                </div>
              </div>
              <p className={`text-xs leading-relaxed ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant' }`}>¡Sigue explorando nuestro catálogo para seguir formándote!</p>
            </div>
          </div>
        </section>
          
        {/* Partners Logos */}
        <section className={`pt-16 pb-8 border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-outline-variant/20' }`}>
          <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-center mb-10 ${ isC ? 'text-[#8a8578]' : 'text-on-surface-variant/50' }`}>Con el sólido respaldo de partners académicos y médicos</p>
          <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-16 lg:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center gap-3 font-black text-xl tracking-tighter cursor-default px-4 hover:scale-105 transition-transform">
              <img src={logoCorporativo} alt="Corporativo Camsa" className="h-10 sm:h-auto max-h-12 w-auto object-contain drop-shadow-sm" />
            </div>
            <div className="flex items-center gap-3 font-black text-xl tracking-tighter cursor-default px-4 hover:scale-105 transition-transform">
              <img src={logoLongevity} alt="Longevity 360" className="h-10 sm:h-auto max-h-14 w-auto object-contain drop-shadow-sm" />
            </div>
            <div className="flex items-center gap-3 font-black text-xl tracking-tighter cursor-default px-4 hover:scale-105 transition-transform">
              <img src={logoMaily} alt="Maily Academia" className="h-12 sm:h-auto max-h-14 w-auto object-contain drop-shadow-sm" />
            </div>
          </div>
        </section>
          
      </div>
    </div>

    {/* Maily Soft Presentation Modal */}
    <AnimatePresence>
      {showMailyModal && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={() => setShowMailyModal(false)}
          />
          {/* Modal content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <img src={logoMaily} alt="Maily Academia" className="h-8 w-auto object-contain" />
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Presentación de Maily Academia</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Conoce el software que impulsa tu aprendizaje</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMailyModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              {/* Modal body */}
              <div className="p-6 space-y-6">
                {mailyVideosLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : mailyVideos.length === 0 ? (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No hay videos de presentación disponibles en este momento.</p>
                    <Link
                      to="/maily-academia/presentacion"
                      className="mt-4 inline-flex items-center gap-2 text-maily hover:text-maily-dark text-sm font-medium"
                      onClick={() => setShowMailyModal(false)}
                    >
                      Ver página completa <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  mailyVideos.map((video, i) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm"
                    >
                      <div className="aspect-video bg-gray-900 relative">
                        <iframe
                          src={toEmbedUrl(video.embed_url)}
                          title={video.title}
                          className="absolute inset-0 w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        {video.duration && (
                          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                            <Play className="w-3 h-3" />
                            {video.duration}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{video.description}</p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    </>
  );
};

export default Dashboard;
