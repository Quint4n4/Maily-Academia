import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Play,
  ChevronRight,
  Flame,
  Star,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { Card, ProgressBar, Badge } from '../components/ui';
import coursesData from '../data/courses';

const Dashboard = () => {
  const { user } = useAuth();
  const { progress, getCourseProgress } = useProgress();

  // Calcular estadísticas
  const stats = useMemo(() => {
    const coursesStarted = Object.keys(progress.courses || {}).length;
    const totalCertificates = progress.certificates?.length || 0;

    // Calcular cursos completados
    let coursesCompleted = 0;
    coursesData.forEach(course => {
      const lessonsPerModule = {};
      course.modules.forEach(m => {
        lessonsPerModule[m.id] = m.lessons.length;
      });
      const courseProgress = getCourseProgress(course.id, course.modules.length, lessonsPerModule);
      if (courseProgress.completedModules === course.modules.length) {
        coursesCompleted++;
      }
    });

    return {
      coursesStarted,
      coursesCompleted,
      totalCertificates,
      streak: progress.streak || 0
    };
  }, [progress, getCourseProgress]);

  // Obtener cursos en progreso
  const coursesInProgress = useMemo(() => {
    return coursesData.filter(course => {
      const courseProgress = progress.courses?.[course.id];
      if (!courseProgress) return false;

      const lessonsPerModule = {};
      course.modules.forEach(m => {
        lessonsPerModule[m.id] = m.lessons.length;
      });
      const progressData = getCourseProgress(course.id, course.modules.length, lessonsPerModule);
      return progressData.percentage > 0 && progressData.percentage < 100;
    }).map(course => {
      const lessonsPerModule = {};
      course.modules.forEach(m => {
        lessonsPerModule[m.id] = m.lessons.length;
      });
      return {
        ...course,
        progress: getCourseProgress(course.id, course.modules.length, lessonsPerModule)
      };
    });
  }, [progress, getCourseProgress]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const statCards = [
    {
      icon: BookOpen,
      label: 'Cursos iniciados',
      value: stats.coursesStarted,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-100'
    },
    {
      icon: Award,
      label: 'Certificados',
      value: stats.totalCertificates,
      color: 'bg-yellow-500',
      lightColor: 'bg-yellow-100'
    },
    {
      icon: TrendingUp,
      label: 'Completados',
      value: stats.coursesCompleted,
      color: 'bg-green-500',
      lightColor: 'bg-green-100'
    },
    {
      icon: Flame,
      label: 'Racha de días',
      value: stats.streak,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-100'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header con saludo */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 dark:from-blue-700 dark:via-blue-800 dark:to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold">
              {getGreeting()}, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-white/80 mt-2">
              Continúa tu aprendizaje donde lo dejaste
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Stats cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          {statCards.map((stat, index) => (
            <motion.div key={index} variants={itemVariants}>
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
                <div className={`absolute -right-4 -bottom-4 w-20 h-20 ${stat.color} opacity-5 rounded-full`} />
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Contenido principal */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cursos en progreso */}
            {coursesInProgress.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Continuar aprendiendo
                  </h2>
                  <Link
                    to="/courses"
                    className="text-maily dark:text-blue-400 hover:text-maily-dark dark:hover:text-blue-300 text-sm font-medium flex items-center gap-1"
                  >
                    Ver todos
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="space-y-4">
                  {coursesInProgress.slice(0, 2).map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`}>
                      <Card hover className="flex gap-4">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-32 h-24 object-cover rounded-xl"
                        />
                        <div className="flex-1 min-w-0">
                          <Badge variant="primary" size="sm" className="mb-2">
                            {course.level}
                          </Badge>
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {course.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Módulo {course.progress.completedModules + 1} de {course.progress.totalModules}
                          </p>
                          <div className="mt-3">
                            <ProgressBar
                              value={course.progress.percentage}
                              showLabel={false}
                              size="sm"
                            />
                          </div>
                        </div>
                        <button className="self-center p-3 bg-maily dark:bg-blue-600 text-white rounded-full hover:bg-maily-dark dark:hover:bg-blue-700 transition-colors">
                          <Play className="w-5 h-5" />
                        </button>
                      </Card>
                    </Link>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Todos los cursos */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Explora nuestros cursos
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {coursesData.map((course, index) => {
                  const lessonsPerModule = {};
                  course.modules.forEach(m => {
                    lessonsPerModule[m.id] = m.lessons.length;
                  });
                  const courseProgress = getCourseProgress(course.id, course.modules.length, lessonsPerModule);

                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <Link to={`/course/${course.id}`}>
                        <Card hover padding={false} className="overflow-hidden">
                          <div className="relative">
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                              className="w-full h-40 object-cover"
                            />
                            {courseProgress.percentage > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-full bg-maily dark:bg-blue-500 transition-all"
                                  style={{ width: `${courseProgress.percentage}%` }}
                                />
                              </div>
                            )}
                            <div className="absolute top-3 left-3">
                              <Badge
                                variant={course.level === 'Principiante' ? 'success' : course.level === 'Intermedio' ? 'warning' : 'danger'}
                                size="sm"
                              >
                                {course.level}
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
                                  {course.totalLessons} lecciones
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="text-sm font-medium">{course.rating}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tu progreso */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tu progreso general</h3>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 rounded-xl">
                    <div className="relative w-24 h-24 mx-auto mb-3">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="#E2E8F0"
                          className="dark:stroke-gray-700"
                          strokeWidth="8"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          fill="none"
                          stroke="#2563eb"
                          className="dark:stroke-blue-500"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${(stats.coursesStarted > 0 ? (stats.coursesCompleted / coursesData.length) : 0) * 251.2} 251.2`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-maily dark:text-blue-400">
                          {Math.round((stats.coursesCompleted / coursesData.length) * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {stats.coursesCompleted} de {coursesData.length} cursos completados
                    </p>
                  </div>

                  {stats.streak > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                        <Flame className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{stats.streak} días seguidos</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">¡Sigue así!</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Certificados recientes */}
            {progress.certificates?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Certificados recientes</h3>
                    <Link to="/certificates" className="text-maily dark:text-blue-400 text-sm hover:text-maily-dark dark:hover:text-blue-300">
                      Ver todos
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {progress.certificates.slice(-3).reverse().map((cert, index) => (
                      <div
                        key={cert.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      >
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {cert.moduleTitle}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{cert.courseTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Instructores */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Nuestros instructores</h3>
                <div className="space-y-3">
                  {[...new Set(coursesData.map(c => c.instructor))].map((instructor, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(instructor)}&background=2563eb&color=fff`}
                        alt={instructor}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{instructor}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Instructor certificado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
