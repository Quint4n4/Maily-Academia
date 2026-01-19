import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  BookOpen,
  Users,
  Star,
  Play,
  CheckCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Award,
  FileText
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { Card, Button, Badge, ProgressBar } from '../components/ui';
import coursesData from '../data/courses';

const CourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getCourseProgress, isModuleComplete, isLessonComplete, hasCertificate } = useProgress();

  const [expandedModules, setExpandedModules] = useState([1]); // Primer módulo expandido por defecto

  const course = useMemo(() => {
    return coursesData.find(c => c.id === parseInt(courseId));
  }, [courseId]);

  const courseProgress = useMemo(() => {
    if (!course) return null;
    const lessonsPerModule = {};
    course.modules.forEach(m => {
      lessonsPerModule[m.id] = m.lessons.length;
    });
    return getCourseProgress(course.id, course.modules.length, lessonsPerModule);
  }, [course, getCourseProgress]);

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Curso no encontrado</h2>
          <Button onClick={() => navigate('/dashboard')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const toggleModule = (moduleId) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getModuleStatus = (module, moduleIndex) => {
    const isComplete = isModuleComplete(course.id, module.id, module.lessons.length);
    const hasCert = hasCertificate(course.id, module.id);

    // Verificar si el módulo anterior está completo (para desbloquear)
    let isUnlocked = moduleIndex === 0;
    if (moduleIndex > 0) {
      const prevModule = course.modules[moduleIndex - 1];
      isUnlocked = isModuleComplete(course.id, prevModule.id, prevModule.lessons.length);
    }

    return { isComplete, hasCert, isUnlocked };
  };

  const getLessonStatus = (moduleId, lessonId) => {
    return isLessonComplete(course.id, moduleId, lessonId);
  };

  // Encontrar la siguiente lección a ver
  const getNextLesson = () => {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (!isLessonComplete(course.id, module.id, lesson.id)) {
          return { moduleId: module.id, lessonId: lesson.id };
        }
      }
    }
    return null;
  };

  const nextLesson = getNextLesson();

  return (
    <div className="min-h-screen pb-12">
      {/* Header del curso */}
      <div className="bg-gradient-to-br from-maily via-maily to-maily-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge variant="accent" className="mb-4">
                  {course.level}
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                  {course.title}
                </h1>
                <p className="text-white/80 text-lg mb-6">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 text-white/90">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(course.instructor)}&background=ffffff&color=4A90A4`}
                      alt={course.instructor}
                      className="w-8 h-8 rounded-full"
                    />
                    <span>{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    <span>{course.totalLessons} lecciones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>{course.students.toLocaleString()} estudiantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span>{course.rating}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Card de progreso */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/10 backdrop-blur-lg border-white/20">
                <div className="text-center mb-6">
                  <div className="relative w-28 h-28 mx-auto mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        fill="none"
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        fill="none"
                        stroke="white"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(courseProgress?.percentage || 0) / 100 * 301.6} 301.6`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">
                        {courseProgress?.percentage || 0}%
                      </span>
                    </div>
                  </div>
                  <p className="text-white/80">
                    {courseProgress?.completedModules || 0} de {course.modules.length} módulos completados
                  </p>
                </div>

                {nextLesson && (
                  <Button
                    variant="accent"
                    className="w-full"
                    size="lg"
                    icon={Play}
                    onClick={() => navigate(`/course/${course.id}/lesson/${nextLesson.moduleId}/${nextLesson.lessonId}`)}
                  >
                    {courseProgress?.percentage > 0 ? 'Continuar curso' : 'Comenzar curso'}
                  </Button>
                )}

                {courseProgress?.percentage === 100 && (
                  <div className="text-center text-white/80 mt-4">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <p>¡Curso completado!</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Contenido del curso */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Lista de módulos */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Contenido del curso
            </h2>

            {course.modules.map((module, moduleIndex) => {
              const { isComplete, hasCert, isUnlocked } = getModuleStatus(module, moduleIndex);
              const isExpanded = expandedModules.includes(module.id);
              const completedLessons = module.lessons.filter(l =>
                getLessonStatus(module.id, l.id)
              ).length;

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: moduleIndex * 0.1 }}
                >
                  <Card
                    padding={false}
                    hover={false}
                    className={`overflow-hidden ${!isUnlocked ? 'opacity-60' : ''}`}
                  >
                    {/* Header del módulo */}
                    <button
                      onClick={() => isUnlocked && toggleModule(module.id)}
                      className={`w-full p-4 flex items-center justify-between ${isUnlocked ? 'hover:bg-gray-50' : 'cursor-not-allowed'} transition-colors`}
                      disabled={!isUnlocked}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          ${isComplete
                            ? 'bg-green-100 text-green-600'
                            : isUnlocked
                              ? 'bg-maily-light text-maily'
                              : 'bg-gray-100 text-gray-400'
                          }
                        `}>
                          {isComplete ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : !isUnlocked ? (
                            <Lock className="w-6 h-6" />
                          ) : (
                            <span className="text-lg font-bold">{moduleIndex + 1}</span>
                          )}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-gray-900">
                            {module.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {completedLessons} de {module.lessons.length} lecciones
                            {hasCert && (
                              <span className="ml-2 text-yellow-600">
                                • Certificado obtenido
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {isComplete && (
                          <Badge variant="success" size="sm">
                            Completado
                          </Badge>
                        )}
                        {isUnlocked && (
                          isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )
                        )}
                      </div>
                    </button>

                    {/* Progress bar del módulo */}
                    {isUnlocked && (
                      <div className="px-4 pb-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-maily rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedLessons / module.lessons.length) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Lista de lecciones */}
                    <AnimatePresence>
                      {isExpanded && isUnlocked && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-gray-100">
                            {module.lessons.map((lesson, lessonIndex) => {
                              const isLessonCompleted = getLessonStatus(module.id, lesson.id);

                              return (
                                <button
                                  key={lesson.id}
                                  onClick={() => navigate(`/course/${course.id}/lesson/${module.id}/${lesson.id}`)}
                                  className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                                >
                                  <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                    ${isLessonCompleted
                                      ? 'bg-green-100 text-green-600'
                                      : 'bg-gray-100 text-gray-400'
                                    }
                                  `}>
                                    {isLessonCompleted ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex-1 text-left">
                                    <p className={`font-medium ${isLessonCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                      {lesson.title}
                                    </p>
                                  </div>
                                  <span className="text-sm text-gray-400">
                                    {lesson.duration}
                                  </span>
                                </button>
                              );
                            })}

                            {/* Quiz del módulo */}
                            <button
                              onClick={() => navigate(`/course/${course.id}/quiz/${module.id}`)}
                              className="w-full p-4 flex items-center gap-4 bg-maily-light/50 hover:bg-maily-light transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-maily text-white flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-medium text-maily">
                                  Quiz: {module.title}
                                </p>
                                <p className="text-sm text-maily/70">
                                  {module.quiz.questions.length} preguntas • Puntaje mínimo: {module.quiz.passingScore}%
                                </p>
                              </div>
                              {hasCert && (
                                <Badge variant="success" size="sm" icon={Award}>
                                  Aprobado
                                </Badge>
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Sidebar con progreso vertical */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Card>
                <h3 className="font-semibold text-gray-900 mb-6">Tu progreso</h3>

                {/* Timeline vertical */}
                <div className="relative">
                  {/* Línea de fondo */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200" />

                  {/* Línea de progreso */}
                  <motion.div
                    className="absolute left-4 top-4 w-0.5 bg-maily"
                    initial={{ height: 0 }}
                    animate={{
                      height: `${(courseProgress?.completedModules || 0) / course.modules.length * 100}%`
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />

                  {/* Módulos */}
                  <div className="space-y-8">
                    {course.modules.map((module, index) => {
                      const { isComplete, hasCert, isUnlocked } = getModuleStatus(module, index);
                      const isCurrent = !isComplete && isUnlocked;

                      return (
                        <div key={module.id} className="relative flex items-start gap-4">
                          {/* Indicador */}
                          <div className="relative z-10">
                            <motion.div
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center
                                transition-all duration-300
                                ${isComplete
                                  ? 'bg-maily text-white shadow-lg shadow-maily/30'
                                  : isCurrent
                                    ? 'bg-white border-2 border-maily text-maily'
                                    : 'bg-white border-2 border-gray-200 text-gray-400'
                                }
                              `}
                              animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 2 }}
                            >
                              {isComplete ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : !isUnlocked ? (
                                <Lock className="w-3 h-3" />
                              ) : (
                                <span className="text-sm font-bold">{index + 1}</span>
                              )}
                            </motion.div>
                            {isCurrent && (
                              <div className="absolute inset-0 rounded-full bg-maily/20 animate-ping" />
                            )}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 pt-1">
                            <h4 className={`
                              text-sm font-medium
                              ${isComplete
                                ? 'text-maily'
                                : isCurrent
                                  ? 'text-gray-900'
                                  : 'text-gray-400'
                              }
                            `}>
                              {module.title.replace(/Módulo \d+: /, '')}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {module.lessons.length} lecciones
                            </p>
                            {hasCert && (
                              <div className="flex items-center gap-1 mt-1 text-yellow-600">
                                <Award className="w-3 h-3" />
                                <span className="text-xs">Certificado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resumen */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-maily">
                        {courseProgress?.totalLessonsCompleted || 0}
                      </p>
                      <p className="text-xs text-gray-500">Lecciones vistas</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-500">
                        {course.modules.filter((m, i) =>
                          hasCertificate(course.id, m.id)
                        ).length}
                      </p>
                      <p className="text-xs text-gray-500">Certificados</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseView;
