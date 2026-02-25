import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, ChevronDown, ChevronRight, Play, Lock, Award, DollarSign, CheckCircle } from 'lucide-react';
import { Card, Badge, Button, ProgressBar } from '../components/ui';
import VideoPreview from '../components/VideoPreview';
import PaymentModal from '../components/PaymentModal';
import courseService from '../services/courseService';
import { useProgress } from '../context/ProgressContext';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };

const CourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const {
    loadCourseProgress,
    loadFinalEvalRequest,
    requestFinalEvaluation,
    getCachedFinalEvalRequest,
  } = useProgress();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [expandedModules, setExpandedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [requestingEval, setRequestingEval] = useState(false);
  const [evalStatusMessage, setEvalStatusMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const courseData = await courseService.getById(courseId);
        setCourse(courseData);
        let progressData = null;
        try {
          progressData = await loadCourseProgress(courseId);
        } catch { /* not enrolled */ }
        setProgress(progressData);
        if (courseData.modules?.length > 0) {
          setExpandedModules([courseData.modules[0].id]);
        }
        // Cargar estado real de solicitud de evaluación al montar
        if (courseData.requires_final_evaluation && progressData) {
          const evalRes = await loadFinalEvalRequest(courseId);
          if (evalRes.success) {
            const req = evalRes.data;
            if (req.status === 'pending') {
              setEvalStatusMessage('Tu solicitud de evaluación final está pendiente de aprobación del profesor.');
            } else if (req.status === 'approved') {
              setEvalStatusMessage('Tu evaluación final está aprobada. Haz clic en "Ir a evaluación" para iniciarla.');
            } else if (req.status === 'expired') {
              setEvalStatusMessage('La ventana de tu evaluación ha expirado. Pide a tu profesor que la reactive.');
            } else if (req.status === 'completed') {
              setEvalStatusMessage('Ya completaste la evaluación final de este curso.');
            }
          }
        }
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [courseId]);

  const requireSequential = course?.require_sequential_progress || progress?.require_sequential_progress;
  const completedIds = progress?.completed_lesson_ids || [];
  const isEnrolled = progress && progress.total_lessons !== undefined;
  const accessibleLessonIds = useMemo(() => {
    if (!isEnrolled || !requireSequential || !course?.modules) return null;
    const set = new Set();
    const modules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let prevCompleted = true;
    for (const mod of modules) {
      const lessons = (mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      for (const les of lessons) {
        if (prevCompleted) set.add(les.id);
        prevCompleted = completedIds.includes(les.id);
      }
    }
    return set;
  }, [isEnrolled, requireSequential, completedIds, course?.modules]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await courseService.enroll(courseId);
      const progressData = await loadCourseProgress(courseId);
      setProgress(progressData);
    } catch { /* empty */ }
    setEnrolling(false);
  };

  const handlePurchase = async (cardData) => {
    const res = await courseService.purchaseCourse(courseId, cardData);
    if (res.enrollment) {
      const progressData = await loadCourseProgress(courseId);
      setProgress(progressData);
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12 text-gray-500">Curso no encontrado</div>;
  }

  const isFree = !course.price || Number(course.price) === 0;
  const firstModule = course.modules?.[0];
  const firstLesson = firstModule?.lessons?.[0];
  const isFirstLesson = (mod, les) => firstModule?.id === mod.id && firstLesson?.id === les.id;

  const canAccessLesson = (mod, les) => {
    if (!isEnrolled && !isFirstLesson(mod, les)) return false;
    if (!isEnrolled && isFirstLesson(mod, les)) return true;
    if (!requireSequential) return true;
    return accessibleLessonIds ? accessibleLessonIds.has(les.id) : true;
  };

  const handleRequestFinalEvaluation = async () => {
    if (!course || !isEnrolled) return;
    setRequestingEval(true);
    setEvalStatusMessage('');
    const res = await requestFinalEvaluation(courseId);
    if (res.success) {
      const req = res.data;
      if (req.status === 'pending') {
        setEvalStatusMessage('Tu solicitud de evaluación final ha sido enviada. Espera a que tu profesor la apruebe.');
      } else if (req.status === 'approved') {
        setEvalStatusMessage('Tu evaluación final está aprobada. Haz clic en "Ir a evaluación" para iniciarla.');
      } else if (req.status === 'expired') {
        setEvalStatusMessage('La ventana de tu evaluación ha expirado. Pide a tu profesor que la reactive.');
      } else if (req.status === 'completed') {
        setEvalStatusMessage('Ya completaste la evaluación final de este curso.');
      }
    } else {
      setEvalStatusMessage(res.error);
    }
    setRequestingEval(false);
  };

  const activeEvalRequest = isEnrolled ? getCachedFinalEvalRequest(courseId) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-white mb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <Badge variant="accent" size="sm" className="mb-3">
              {LEVEL_LABELS[course.level] || course.level}
            </Badge>
            <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
            <p className="text-white/80 mb-4">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
              <span className="flex items-center gap-1"><Users size={16} />{course.instructor_name}</span>
              <span className="flex items-center gap-1"><Clock size={16} />{course.duration}</span>
              <span className="flex items-center gap-1"><BookOpen size={16} />{course.total_lessons} lecciones</span>
              <span className="flex items-center gap-1"><DollarSign size={16} />
                {isFree ? 'Gratis' : `$${Number(course.price).toFixed(2)}`}
              </span>
            </div>
            {!isEnrolled && (
              <div className="mt-6 flex gap-3">
                {isFree ? (
                  <Button size="lg" onClick={handleEnroll} loading={enrolling}>
                    Inscribirme en este curso
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setShowPayment(true)}>
                    Comprar curso
                  </Button>
                )}
              </div>
            )}
          </div>
          {course.thumbnail && (
            <div className="w-full lg:w-80 aspect-video flex-shrink-0 rounded-xl overflow-hidden">
              <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
        {isEnrolled && progress && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm">Progreso del curso</span>
              <span className="text-sm font-bold">{progress.progress_percent}%</span>
            </div>
            <ProgressBar value={progress.progress_percent} showLabel={false} size="sm" />
          </div>
        )}
      </div>

      {/* Preview: first video */}
      {!isEnrolled && firstLesson && (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vista previa del curso</h2>
          <VideoPreview url={firstLesson.video_url} provider={firstLesson.video_provider} className="mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Primera lección: {firstLesson.title}. {isFree ? 'Inscríbete para acceder al curso completo.' : 'Compra el curso para desbloquear todo el contenido.'}
          </p>
        </Card>
      )}

      {/* Modules */}
      <div className="space-y-4">
        {(course.modules || []).map((mod, mi) => (
          <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mi * 0.05 }}>
            <Card className="overflow-hidden" padding={false}>
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-maily/10 text-maily flex items-center justify-center text-sm font-bold">
                    {mi + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{mod.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{mod.description} &middot; {mod.lessons?.length || 0} lecciones</p>
                  </div>
                </div>
                {expandedModules.includes(mod.id) ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronRight size={20} className="text-gray-400" />}
              </button>

              {expandedModules.includes(mod.id) && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {(mod.lessons || []).map((lesson, li) => {
                    const canAccess = canAccessLesson(mod, lesson);
                    return (
                      <Link
                        key={lesson.id}
                        to={canAccess ? `/course/${courseId}/lesson/${mod.id}/${lesson.id}` : '#'}
                        onClick={(e) => !canAccess && e.preventDefault()}
                        className={`flex items-center gap-3 px-5 py-3 border-b border-gray-50 dark:border-gray-800 transition-colors ${
                          canAccess ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                          {li + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{lesson.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{lesson.duration}</p>
                        </div>
                        {canAccess ? (
                          <Play size={16} className="text-maily" />
                        ) : (
                          <Lock size={16} className="text-gray-400" />
                        )}
                      </Link>
                    );
                  })}
                  {mod.quiz && isEnrolled && (
                    <Link
                      to={`/course/${courseId}/quiz/${mod.id}`}
                      className="flex items-center gap-3 px-5 py-3 bg-maily/5 hover:bg-maily/10 transition-colors"
                    >
                      <Award size={16} className="text-maily" />
                      <span className="text-sm font-medium text-maily">Quiz del módulo</span>
                    </Link>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Final evaluation section */}
      {isEnrolled && (
        <Card className="mt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-maily" />
                Evaluación final del curso
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Solicita la evaluación final cuando hayas completado todas las lecciones y quizzes del curso.
              </p>
              {evalStatusMessage && (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {evalStatusMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate(`/course/${courseId}/evaluation`)}
                disabled={!activeEvalRequest}
              >
                Ir a evaluación
              </Button>
              <Button
                onClick={handleRequestFinalEvaluation}
                loading={requestingEval}
              >
                Solicitar evaluación final
              </Button>
            </div>
          </div>
        </Card>
      )}

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        courseTitle={course.title}
        price={course.price}
        onSuccess={handlePurchase}
      />
    </div>
  );
};

export default CourseView;
