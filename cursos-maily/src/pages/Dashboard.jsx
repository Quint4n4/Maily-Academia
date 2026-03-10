import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Award, TrendingUp, Play, ChevronRight, Flame, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { useSection } from '../context/SectionContext';
import { Card, ProgressBar, Badge } from '../components/ui';
import courseService from '../services/courseService';
import logoMaily from '../../Logos/logomaily.png';
import logoCorporativo from '../../Logos/logocorporativo.png';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentSection } = useSection();
  const { loadDashboard, loadCertificates } = useProgress();
  const [dashData, setDashData] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen pb-12">
      <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 dark:from-blue-700 dark:via-blue-800 dark:to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl sm:text-3xl font-bold">
              {getGreeting()}, {user?.firstName || user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/80 mt-2">Continúa tu aprendizaje donde lo dejaste</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="relative overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`p-2 sm:p-3 rounded-xl ${stat.lightColor} flex-shrink-0`}>
                    <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {user?.role === 'student' && !user?.hasCompletedSurvey && (
              <section>
                <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-dashed border-maily/40 bg-maily/5">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                      Personaliza tus recomendaciones
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Responde una encuesta de menos de 2 minutos y te mostraremos cursos recomendados
                      según tus intereses.
                    </p>
                  </div>
                  <Link
                    to="/survey"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg bg-maily text-white hover:bg-maily-dark transition-colors"
                  >
                    Responder encuesta
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Card>
              </section>
            )}
            {/* Bloque promocional Maily Academia — solo visible para usuarios de Longevity 360 */}
            {user?.role === 'student' && currentSection === 'longevity-360' && (
              <section className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 dark:from-blue-800 dark:via-blue-900 dark:to-blue-950 text-white p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={logoMaily}
                      alt="Maily Academia"
                      className="h-12 sm:h-14 w-auto object-contain drop-shadow-md bg-white/10 rounded-xl p-1.5"
                    />
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold">Maily Academia</h2>
                      <p className="text-blue-100 dark:text-blue-200 text-sm mt-0.5">
                        Domina el software Maily con cursos especializados de la academia oficial
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/maily-academia/presentacion"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold hover:bg-blue-50 transition-colors shadow-lg flex-shrink-0"
                  >
                    <Video className="w-5 h-5" />
                    Conocer Maily Academia
                  </Link>
                </div>
              </section>
            )}

            {/* Bloque Corporativo CAMSA — solo visible para usuarios de la sección corporativa */}
            {user?.role === 'student' && currentSection === 'corporativo-camsa' && (
              <section className="rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6 sm:p-8 border border-yellow-600/30">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-black rounded-xl p-2 flex-shrink-0">
                      <img
                        src={logoCorporativo}
                        alt="Corporativo CAMSA"
                        className="h-10 sm:h-12 w-auto object-contain max-w-[140px]"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-yellow-400">Corporativo CAMSA</h2>
                      <p className="text-gray-300 text-sm mt-0.5">
                        Contenido de capacitación exclusivo para trabajadores del corporativo
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Recommended courses */}
            {user?.role === 'student' && recommendedCourses.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Recomendados para ti
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {recommendedCourses.slice(0, 6).map((course, i) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * i }}
                    >
                      <Link to={`/course/${course.id}`}>
                        <Card hover padding={false} className="overflow-hidden">
                          <div className="relative aspect-video">
                            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                            <div className="absolute top-3 left-3">
                              <Badge
                                variant={
                                  course.level === 'beginner'
                                    ? 'success'
                                    : course.level === 'intermediate'
                                      ? 'warning'
                                      : 'danger'
                                }
                                size="sm"
                              >
                                {course.level === 'beginner'
                                  ? 'Principiante'
                                  : course.level === 'intermediate'
                                    ? 'Intermedio'
                                    : 'Avanzado'}
                              </Badge>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {course.description}
                            </p>
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {course.duration}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-4 h-4" />
                                  {course.total_lessons} lecciones
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-semibold ${
                                    (!course.price || Number(course.price) === 0)
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-maily'
                                  }`}
                                >
                                  {(!course.price || Number(course.price) === 0)
                                    ? 'Gratis'
                                    : `$${Number(course.price).toFixed(2)}`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* All courses */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Explora nuestros cursos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {allCourses.map((course, i) => (
                  <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                    <Link to={`/course/${course.id}`}>
                      <Card hover padding={false} className="overflow-hidden">
                        <div className="relative aspect-video">
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                          <div className="absolute top-3 left-3">
                            <Badge variant={course.level === 'beginner' ? 'success' : course.level === 'intermediate' ? 'warning' : 'danger'} size="sm">
                              {course.level === 'beginner' ? 'Principiante' : course.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                            </Badge>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{course.title}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{course.description}</p>
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{course.duration}</span>
                              <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{course.total_lessons} lecciones</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${(!course.price || Number(course.price) === 0) ? 'text-green-600 dark:text-green-400' : 'text-maily'}`}>
                                {(!course.price || Number(course.price) === 0) ? 'Gratis' : `$${Number(course.price).toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Continuar aprendiendo - columna derecha */}
            {coursesInProgress.length > 0 && (
              <Card>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Continuar aprendiendo</h3>
                <div className="space-y-3">
                  {coursesInProgress.slice(0, 4).map((cp) => {
                    const course = allCourses.find((c) => c.id === cp.course_id);
                    const resumeUrl = cp.resume_at
                      ? `/course/${cp.course_id}/lesson/${cp.resume_at.module_id}/${cp.resume_at.lesson_id}`
                      : `/course/${cp.course_id}`;
                    return (
                      <Link key={cp.course_id} to={resumeUrl}>
                        <div className="flex gap-3 p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          {course?.thumbnail && (
                            <img src={course.thumbnail} alt="" className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">{cp.course_title}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {cp.completed_lessons}/{cp.total_lessons} lecciones
                            </p>
                            <ProgressBar value={cp.progress_percent} showLabel={false} size="sm" className="mt-2" />
                          </div>
                          <span className="self-center p-2 bg-maily text-white rounded-full flex-shrink-0" aria-label="Reanudar">
                            <Play className="w-4 h-4" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link to="/my-courses" className="mt-3 block text-center text-sm text-maily font-medium hover:underline">
                  Ver mis cursos
                </Link>
              </Card>
            )}

            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tu progreso general</h3>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-xl">
                <div className="relative w-24 h-24 mx-auto mb-3">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#E2E8F0" className="dark:stroke-gray-700" strokeWidth="8" />
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#2563eb" className="dark:stroke-blue-500" strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(allCourses.length > 0 ? (stats.coursesCompleted / allCourses.length) : 0) * 251.2} 251.2`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-maily dark:text-blue-400">
                      {allCourses.length > 0 ? Math.round((stats.coursesCompleted / allCourses.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.coursesCompleted} de {allCourses.length} cursos completados
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
