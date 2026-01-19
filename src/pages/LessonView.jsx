import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Clock,
  BookOpen,
  MessageSquare,
  ThumbsUp,
  Share2,
  ChevronRight,
  Check
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { Card, Button, Badge } from '../components/ui';
import coursesData from '../data/courses';

const LessonView = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { completeLesson, isLessonComplete } = useProgress();

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const course = useMemo(() => {
    return coursesData.find(c => c.id === parseInt(courseId));
  }, [courseId]);

  const module = useMemo(() => {
    return course?.modules.find(m => m.id === parseInt(moduleId));
  }, [course, moduleId]);

  const lesson = useMemo(() => {
    return module?.lessons.find(l => l.id === parseInt(lessonId));
  }, [module, lessonId]);

  // Obtener índices para navegación
  const { prevLesson, nextLesson, currentIndex, totalLessons } = useMemo(() => {
    if (!module) return { prevLesson: null, nextLesson: null, currentIndex: 0, totalLessons: 0 };

    const currentIdx = module.lessons.findIndex(l => l.id === parseInt(lessonId));
    const prev = currentIdx > 0 ? module.lessons[currentIdx - 1] : null;
    const next = currentIdx < module.lessons.length - 1 ? module.lessons[currentIdx + 1] : null;

    return {
      prevLesson: prev,
      nextLesson: next,
      currentIndex: currentIdx + 1,
      totalLessons: module.lessons.length
    };
  }, [module, lessonId]);

  // Verificar si la lección ya está completada
  useEffect(() => {
    if (course && module && lesson) {
      const completed = isLessonComplete(course.id, module.id, lesson.id);
      setLessonCompleted(completed);
    }
  }, [course, module, lesson, isLessonComplete]);

  if (!course || !module || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lección no encontrada</h2>
          <Button onClick={() => navigate('/dashboard')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const handleMarkComplete = () => {
    completeLesson(course.id, module.id, lesson.id);
    setLessonCompleted(true);
    setShowCompletionModal(true);

    // Auto-cerrar modal después de 2 segundos
    setTimeout(() => {
      setShowCompletionModal(false);
    }, 2500);
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      navigate(`/course/${course.id}/lesson/${module.id}/${nextLesson.id}`);
    } else {
      // Si no hay más lecciones, ir al quiz
      navigate(`/course/${course.id}/quiz/${module.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/course/${course.id}`)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Volver al curso</span>
          </button>

          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-sm">{course.title}</span>
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-white">{module.title.replace(/Módulo \d+: /, '')}</span>
          </div>

          <div className="text-gray-400 text-sm">
            {currentIndex} / {totalLessons}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-0">
          {/* Video player */}
          <div className="lg:col-span-2">
            {/* Video container */}
            <div className="relative aspect-video bg-black">
              <iframe
                src={`${lesson.videoUrl}?autoplay=0`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />

              {/* Overlay de completado */}
              <AnimatePresence>
                {showCompletionModal && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                      >
                        <Check className="w-10 h-10 text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        ¡Lección completada!
                      </h3>
                      <p className="text-gray-400">
                        Continúa con la siguiente lección
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controles del video */}
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => prevLesson && navigate(`/course/${course.id}/lesson/${module.id}/${prevLesson.id}`)}
                  disabled={!prevLesson}
                  className="p-2 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-3 bg-maily text-white rounded-full hover:bg-maily-dark transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleNextLesson}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button className="p-2 text-gray-400 hover:text-white transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Información de la lección */}
            <div className="bg-gray-800 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <Badge variant="primary" className="mb-2">
                    Lección {currentIndex}
                  </Badge>
                  <h1 className="text-2xl font-bold text-white">
                    {lesson.title}
                  </h1>
                </div>
                {!lessonCompleted ? (
                  <Button
                    onClick={handleMarkComplete}
                    variant="accent"
                    icon={CheckCircle}
                  >
                    Marcar completa
                  </Button>
                ) : (
                  <Badge variant="success" size="lg" icon={CheckCircle}>
                    Completada
                  </Badge>
                )}
              </div>

              <p className="text-gray-400 mb-6">
                {lesson.description}
              </p>

              <div className="flex items-center gap-6 text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration}</span>
                </div>
                <button className="flex items-center gap-2 hover:text-white transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Me gusta</span>
                </button>
                <button className="flex items-center gap-2 hover:text-white transition-colors">
                  <Share2 className="w-4 h-4" />
                  <span>Compartir</span>
                </button>
              </div>

              {/* Navegación */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
                {prevLesson ? (
                  <button
                    onClick={() => navigate(`/course/${course.id}/lesson/${module.id}/${prevLesson.id}`)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-xs text-gray-500">Anterior</p>
                      <p className="text-sm">{prevLesson.title}</p>
                    </div>
                  </button>
                ) : (
                  <div />
                )}

                <Button
                  onClick={handleNextLesson}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  {nextLesson ? 'Siguiente lección' : 'Ir al Quiz'}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar - Lista de lecciones */}
          <div className="bg-gray-800 border-l border-gray-700 overflow-y-auto max-h-[calc(100vh-64px)]">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">{module.title}</h3>
              <p className="text-sm text-gray-400 mt-1">
                {module.lessons.filter(l => isLessonComplete(course.id, module.id, l.id)).length} de {module.lessons.length} completadas
              </p>
            </div>

            <div className="divide-y divide-gray-700">
              {module.lessons.map((l, index) => {
                const isCurrentLesson = l.id === lesson.id;
                const isComplete = isLessonComplete(course.id, module.id, l.id);

                return (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/course/${course.id}/lesson/${module.id}/${l.id}`)}
                    className={`
                      w-full p-4 flex items-start gap-3 text-left transition-colors
                      ${isCurrentLesson
                        ? 'bg-maily/20 border-l-2 border-maily'
                        : 'hover:bg-gray-700/50'
                      }
                    `}
                  >
                    <div className={`
                      w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5
                      ${isComplete
                        ? 'bg-green-500 text-white'
                        : isCurrentLesson
                          ? 'bg-maily text-white'
                          : 'bg-gray-600 text-gray-400'
                      }
                    `}>
                      {isComplete ? (
                        <Check className="w-3 h-3" />
                      ) : isCurrentLesson ? (
                        <Play className="w-3 h-3" />
                      ) : (
                        <span className="text-xs">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`
                        text-sm font-medium truncate
                        ${isCurrentLesson ? 'text-white' : isComplete ? 'text-gray-400' : 'text-gray-300'}
                      `}>
                        {l.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{l.duration}</p>
                    </div>
                  </button>
                );
              })}

              {/* Quiz button */}
              <button
                onClick={() => navigate(`/course/${course.id}/quiz/${module.id}`)}
                className="w-full p-4 flex items-center gap-3 bg-maily/10 hover:bg-maily/20 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-maily text-white flex items-center justify-center">
                  <BookOpen className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-maily">Quiz del módulo</p>
                  <p className="text-xs text-gray-500">{module.quiz.questions.length} preguntas</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
