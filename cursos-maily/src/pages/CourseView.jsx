import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Users, ChevronDown, ChevronRight, Play, Lock, Award, DollarSign, CheckCircle, Paperclip } from 'lucide-react';
import { Badge, Button, ProgressBar } from '../components/ui';
import VideoPreview from '../components/VideoPreview';
import PaymentModal from '../components/PaymentModal';
import courseService from '../services/courseService';
import { useProgress } from '../context/ProgressContext';
import { useSection } from '../context/SectionContext';
import { isCamsa } from '../theme/camsaTheme';
import { useToast } from '../context/ToastContext';

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
  const { success: toastSuccess, error: toastError } = useToast();
  const { currentSection } = useSection();
  const isC = isCamsa(currentSection);
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [expandedModules, setExpandedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [requestingEval, setRequestingEval] = useState(false);
  const [evalStatusMessage, setEvalStatusMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const courseData = await courseService.getById(courseId);
        setCourse(courseData);
        let progressData = null;
        try {
          progressData = await loadCourseProgress(courseId);
        } catch { /* user not enrolled – expected */ }
        setProgress(progressData);
        if (courseData.modules?.length > 0) {
          setExpandedModules([courseData.modules[0].id]);
        }
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
      } catch (err) {
        console.error('Error loading course:', err);
        setError('No se pudo cargar el curso. Intenta de nuevo más tarde.');
      }
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
      toastSuccess('¡Inscripción exitosa! Ya puedes acceder al contenido del curso.');
    } catch (err) {
      console.error('Enrollment error:', err);
      const msg = err.response?.data?.detail || 'No se pudo completar la inscripción. Intenta de nuevo.';
      setError(msg);
      toastError(msg);
    }
    setEnrolling(false);
  };

  const handlePurchaseSuccess = async () => {
    try {
      const progressData = await loadCourseProgress(courseId);
      setProgress(progressData);
    } catch { /* enrollment will be created by webhook */ }
  };

  const toggleModule = (moduleId) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  if (loading) {
    return (
      <div className={`font-plus-jakarta-sans min-h-screen ${ isC ? 'bg-[#0e0e0c]' : 'bg-surface dark:bg-gray-950' }`}>
        <div className={`h-64 animate-pulse rounded-b-3xl ${ isC ? 'bg-[#141311]' : 'bg-surface-container' }`} />
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-surface-container animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12 text-gray-500">{error || 'Curso no encontrado'}</div>;
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
    <div className={`font-plus-jakarta-sans min-h-screen ${ isC ? 'bg-[#0e0e0c] text-[#f5f0e8]' : 'bg-surface dark:bg-gray-950 text-on-surface' }`}>

      {/* ── Hero Banner ───────────────────────────────────────── */}
      <div className={`relative overflow-hidden ${ isC ? 'bg-[#141311] border-b border-[rgba(201,168,76,0.15)] shadow-[0_10px_40px_rgba(0,0,0,0.5)]' : '' }`}
        style={ isC ? {} : { background: 'linear-gradient(135deg, #006780 0%, #00b4d8 40%, #ffb347 100%)' } }>
        {isC ? (
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none" style={{ background: 'linear-gradient(to left, #c9a84c, transparent)' }} />
        ) : (
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 60%)', mixBlendMode: 'overlay' }} />
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">

            {/* Left: info */}
            <div className="flex-1 text-white max-w-2xl">
              <Badge variant="accent" size="sm" className="mb-4 bg-white/20 text-white border-none backdrop-blur-sm text-xs font-black uppercase tracking-widest">
                {LEVEL_LABELS[course.level] || course.level}
              </Badge>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter leading-tight mb-3">{course.title}</h1>
              <p className="text-white/80 text-base leading-relaxed mb-6">{course.description}</p>
              <div className="flex flex-wrap items-center gap-5 text-sm text-white/70 mb-6">
                <span className="flex items-center gap-2"><Users size={15} />{course.instructor_name}</span>
                <span className="flex items-center gap-2"><Clock size={15} />{course.duration}</span>
                <span className="flex items-center gap-2"><BookOpen size={15} />{course.total_lessons} lecciones</span>
                {course.materials_count > 0 && (
                  <span className="flex items-center gap-2"><Paperclip size={15} />{course.materials_count} material{course.materials_count !== 1 ? 'es' : ''}</span>
                )}
                <span className="flex items-center gap-2">
                  <DollarSign size={15} />{isFree ? 'Gratis' : `$${Number(course.price).toFixed(2)}`}
                </span>
              </div>

              {/* Enrollment CTAs */}
              {!isEnrolled && (
                <div className="flex gap-3">
                  {isFree ? (
                    <button onClick={handleEnroll} disabled={enrolling}
                      className={`px-8 py-3.5 rounded-full font-extrabold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 ${
                        isC ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c]' : 'bg-white text-stitch-primary'
                      }`}>
                      {enrolling ? 'Inscribiendo...' : 'Inscribirme gratis'}
                    </button>
                  ) : (
                    <button onClick={() => setShowPayment(true)}
                      className={`px-8 py-3.5 rounded-full font-extrabold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all ${
                        isC ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c]' : 'bg-white text-stitch-primary'
                      }`}>
                      Comprar curso
                    </button>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {isEnrolled && progress && (
                <div className="mt-6 space-y-2 max-w-sm">
                  <div className="flex items-center justify-between text-xs font-bold text-white/80 uppercase tracking-widest">
                    <span>Tu progreso</span>
                    <span>{progress.progress_percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20">
                    <div className="h-2 rounded-full bg-white transition-all duration-700"
                      style={{ width: `${progress.progress_percent}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Right: thumbnail / preview */}
            <div className="w-full lg:w-96 flex-shrink-0">
              {course.thumbnail ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video ring-2 ring-white/20">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                </div>
              ) : !isEnrolled && firstLesson ? (
                <div className="rounded-2xl overflow-hidden shadow-2xl aspect-video ring-2 ring-white/20">
                  <VideoPreview url={firstLesson.video_url} provider={firstLesson.video_provider} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2 border border-red-100">
            {error}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main: Modules ─────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            <h2 className={`text-2xl font-extrabold tracking-tight mb-6 ${ isC ? 'text-[#e6c364]' : 'text-on-surface dark:text-white' }`}>
              Contenido del curso
            </h2>

            {(course.modules || []).map((mod, mi) => (
              <motion.div key={mod.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mi * 0.05 }}>
                <div className={`rounded-xl overflow-hidden border ${
                  isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 shadow-sm border-outline-variant/10'
                }`}>
                  {/* Module header */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                      isC ? 'hover:bg-white/5' : 'hover:bg-surface-container dark:hover:bg-gray-700/50'
                    }`}
                    aria-expanded={expandedModules.includes(mod.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        expandedModules.includes(mod.id)
                          ? isC ? 'bg-[#c9a84c]/20 text-[#e6c364]' : 'bg-primary-container/30 text-stitch-primary'
                          : isC ? 'bg-white/5 text-[#8a8578]' : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant'
                      }`}>
                        {mi + 1}
                      </div>
                      <div>
                        <h3 className={`font-bold tracking-tight ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{mod.title}</h3>
                        <p className={`text-xs mt-0.5 ${ isC ? 'text-[#d0c5b2]/70' : 'text-on-surface-variant dark:text-gray-400' }`}>
                          {mod.description && `${mod.description} · `}{mod.lessons?.length || 0} lecciones
                        </p>
                      </div>
                    </div>
                    {expandedModules.includes(mod.id)
                      ? <ChevronDown size={20} className={isC ? 'text-[#e6c364] flex-shrink-0' : 'text-stitch-primary flex-shrink-0'} />
                      : <ChevronRight size={20} className={isC ? 'text-[#8a8578] flex-shrink-0' : 'text-on-surface-variant flex-shrink-0'} />}
                  </button>

                  {/* Lessons list */}
                  {expandedModules.includes(mod.id) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-outline-variant/10' }`}>
                      {(mod.lessons || []).map((lesson, li) => {
                        const canAccess = canAccessLesson(mod, lesson);
                        const lessonCompleted = completedIds.includes(lesson.id);
                        return (
                          <Link
                            key={lesson.id}
                            to={canAccess ? `/course/${courseId}/lesson/${mod.id}/${lesson.id}` : '#'}
                            onClick={(e) => !canAccess && e.preventDefault()}
                            className={`flex items-center gap-4 px-5 py-3.5 border-b transition-colors ${
                              isC ? 'border-[rgba(77,70,55,0.1)]' : 'border-outline-variant/5'
                            } ${
                              canAccess
                                ? isC ? 'hover:bg-white/5 cursor-pointer' : 'hover:bg-surface-container dark:hover:bg-gray-700/40 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              lessonCompleted
                                ? isC ? 'bg-[#c9a84c]/20 text-[#e6c364]' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : isC ? 'bg-[#141311] text-[#8a8578] border border-[rgba(77,70,55,0.3)]' : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant'
                            }`}>
                              {lessonCompleted ? <CheckCircle size={14} /> : li + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold truncate ${
                                lessonCompleted
                                  ? isC ? 'text-[#e6c364]' : 'text-green-700 dark:text-green-400'
                                  : isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white'
                              }`}>{lesson.title}</p>
                              {lesson.duration && <p className={`text-xs mt-0.5 ${ isC ? 'text-[#d0c5b2]/60' : 'text-on-surface-variant/70 dark:text-gray-500' }`}>{lesson.duration}</p>}
                            </div>
                            {lessonCompleted ? (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0 ${
                                isC ? 'text-[#e6c364] bg-[#c9a84c]/20' : 'text-green-600 bg-green-100 dark:bg-green-900/30'
                              }`}>Completada</span>
                            ) : canAccess ? (
                              <Play size={15} className={isC ? 'text-[#c9a84c] flex-shrink-0' : 'text-stitch-primary flex-shrink-0'} />
                            ) : (
                              <Lock size={14} className={isC ? 'text-[#8a8578] flex-shrink-0' : 'text-on-surface-variant flex-shrink-0'} />
                            )}
                          </Link>
                        );
                      })}
                      {/* Quiz */}
                      {mod.quiz && isEnrolled && (
                        <Link
                          to={`/course/${courseId}/quiz/${mod.id}`}
                          className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                            isC ? 'bg-[rgba(230,195,100,0.05)] hover:bg-[rgba(230,195,100,0.1)]' : 'bg-primary-container/5 hover:bg-primary-container/10 dark:hover:bg-gray-700/40'
                          }`}
                        >
                          {progress?.passed_quiz_ids?.includes(mod.quiz.id) ? (
                            <>
                              <CheckCircle size={16} className={`${isC ? 'text-[#e6c364]' : 'text-green-600 dark:text-green-400'} flex-shrink-0`} />
                              <span className={`flex-1 text-sm font-semibold ${isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white'}`}>Quiz del módulo</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                isC ? 'text-[#e6c364] bg-[#c9a84c]/20' : 'text-green-600 bg-green-100 dark:bg-green-900/30'
                              }`}>Aprobado</span>
                            </>
                          ) : (
                            <>
                              <Award size={16} className={`${isC ? 'text-[#c9a84c]' : 'text-stitch-primary'} flex-shrink-0`} />
                              <span className={`flex-1 text-sm font-semibold ${isC ? 'text-[#e6c364]' : 'text-stitch-primary'}`}>Quiz del módulo</span>
                              <ChevronRight size={14} className={isC ? 'text-[#c9a84c]' : 'text-stitch-primary'} />
                            </>
                          )}
                        </Link>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Final Evaluation */}
            {isEnrolled && (
              <div className={`mt-8 p-6 sm:p-8 rounded-xl shadow-sm border ${
                isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 border-outline-variant/10'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className={`text-lg font-extrabold flex items-center gap-2 tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface dark:text-white' }`}>
                      <CheckCircle size={18} className={isC ? 'text-[#c9a84c]' : 'text-stitch-primary'} />
                      Evaluación final del curso
                    </h2>
                    <p className={`text-sm mt-1 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}>
                      Solicita la evaluación final cuando hayas completado todas las lecciones y quizzes del curso.
                    </p>
                    {evalStatusMessage && (
                      <p className={`mt-3 text-sm px-4 py-2.5 rounded-lg ${
                        isC ? 'text-[#e6c364] bg-[rgba(230,195,100,0.1)] border border-[rgba(230,195,100,0.2)]' : 'text-on-surface-variant dark:text-gray-300 bg-surface-container dark:bg-gray-700'
                      }`}>
                        {evalStatusMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/course/${courseId}/evaluation`)}
                      disabled={!activeEvalRequest}
                      className={`px-5 py-2.5 rounded-full font-bold text-sm border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        isC
                          ? 'border-[#c9a84c] text-[#e6c364] hover:bg-[#c9a84c]/20'
                          : 'border-stitch-primary text-stitch-primary hover:bg-stitch-primary hover:text-white'
                      }`}
                    >
                      Ir a evaluación
                    </button>
                    <button
                      onClick={handleRequestFinalEvaluation}
                      disabled={requestingEval}
                      className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all ${
                        isC
                          ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c] disabled:opacity-50'
                          : 'text-white disabled:opacity-60'
                      }`}
                      style={ isC ? {} : { background: 'linear-gradient(135deg, #845400 0%, #ffb347 100%)' } }
                    >
                      {requestingEval ? 'Enviando...' : 'Solicitar evaluación final'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────────────────── */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-5">

            {/* Instructor card */}
            <div className={`rounded-xl p-6 shadow-sm border ${
              isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 border-outline-variant/10'
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${ isC ? 'text-[#8a8578]' : 'text-stitch-primary' }`}>Instructor</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-black ${
                  isC ? 'bg-[#141311] border border-[rgba(230,195,100,0.3)] text-[#e6c364]' : 'bg-primary-container/20 text-stitch-primary'
                }`}>
                  {(course.instructor_name || 'I').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`font-bold text-sm ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{course.instructor_name}</p>
                  <p className={`text-xs ${ isC ? 'text-[#d0c5b2]/70' : 'text-on-surface-variant/70 dark:text-gray-500' }`}>Instructor</p>
                </div>
              </div>
              {course.instructor_bio && (
                <p className={`text-xs leading-relaxed line-clamp-3 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}>{course.instructor_bio}</p>
              )}
            </div>

            {/* Certification CTA */}
            {isEnrolled && progress && (
              <div className={`rounded-xl p-6 ${
                isC ? 'bg-[#e6c364] text-[#141311] shadow-[0_10px_30px_rgba(201,168,76,0.3)]' : 'text-white'
              }`} style={ isC ? {} : { background: 'linear-gradient(135deg, #006780 0%, #00b4d8 100%)' } }>
                <Award size={28} className={isC ? 'mb-3 opacity-90' : 'mb-3 opacity-80'} />
                <h3 className="font-extrabold text-base tracking-tight mb-1">Certificado de finalización</h3>
                <p className={`text-xs mb-4 ${ isC ? 'text-[#141311]/70' : 'text-white/70' }`}>Completa el 100% del curso para obtener tu certificado.</p>
                <div className={`h-1.5 rounded-full mb-1 ${ isC ? 'bg-[#141311]/10' : 'bg-white/20' }`}>
                  <div className={`h-1.5 rounded-full transition-all duration-700 ${ isC ? 'bg-[#141311]' : 'bg-white' }`}
                    style={{ width: `${progress.progress_percent}%` }} />
                </div>
                <p className={`text-xs text-right font-bold ${ isC ? 'text-[#141311]/60' : 'text-white/60' }`}>{progress.progress_percent}% completado</p>
              </div>
            )}

            {/* Course stats */}
            <div className={`rounded-xl p-6 shadow-sm border ${
              isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 border-outline-variant/10'
            }`}>
              <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-4 ${ isC ? 'text-[#8a8578]' : 'text-stitch-primary' }`}>Detalles del curso</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}><BookOpen size={14} /> Lecciones</span>
                  <span className={`font-bold ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{course.total_lessons}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}><Clock size={14} /> Duración</span>
                  <span className={`font-bold ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{course.duration}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className={`flex items-center gap-2 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}><Award size={14} /> Nivel</span>
                  <span className={`font-bold ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{LEVEL_LABELS[course.level] || course.level}</span>
                </li>
                {course.materials_count > 0 && (
                  <li className="flex items-center justify-between">
                    <span className={`flex items-center gap-2 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}><Paperclip size={14} /> Materiales</span>
                    <span className={`font-bold ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>{course.materials_count}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        courseId={courseId}
        courseTitle={course.title}
        price={course.price}
        currency="mxn"
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};

export default CourseView;
