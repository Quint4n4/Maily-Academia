import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, MessageSquare, Send, Lock, Download, FileText, File, Image } from 'lucide-react';
import { Badge } from '../components/ui';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import courseService from '../services/courseService';
import materialService from '../services/materialService';
import { useProgress } from '../context/ProgressContext';
import { useToast } from '../context/ToastContext';
import qnaService from '../services/qnaService';
import progressService from '../services/progressService';
import YouTubePlayer from '../components/YouTubePlayer';
import { useSection } from '../context/SectionContext';
import { isCamsa } from '../theme/camsaTheme';

const LessonView = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { completeLesson, isLessonComplete, loadCourseProgress } = useProgress();
  const { currentSection } = useSection();
  const isC = isCamsa(currentSection);

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const { success: toastSuccess } = useToast();
  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Q&A
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState({ title: '', body: '' });
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Material de apoyo
  const [lessonMaterials, setLessonMaterials] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await courseService.getById(courseId);
        setCourse(data);
        const mod = data.modules?.find((m) => String(m.id) === String(moduleId));
        setCurrentModule(mod);
        const les = mod?.lessons?.find((l) => String(l.id) === String(lessonId));
        setCurrentLesson(les);

        let prog = null;
        try {
          prog = await loadCourseProgress(courseId);
          setProgress(prog);
        } catch { /* not enrolled */ }
        const enrolled = prog && prog.total_lessons !== undefined;
        setIsEnrolled(enrolled);

        setCompleted(prog?.completed_lesson_ids?.includes(Number(lessonId)) ?? isLessonComplete(Number(lessonId)));

        try {
          const qRes = await qnaService.getQuestions(lessonId);
          setQuestions(qRes.results || qRes);
        } catch (err) {
          console.error('Error loading Q&A:', err);
        }
        try {
          const mats = await materialService.list(courseId, { lesson: lessonId });
          setLessonMaterials(Array.isArray(mats) ? mats : mats.results || []);
        } catch { setLessonMaterials([]); }
      } catch (err) {
        console.error('Error loading lesson:', err);
        setError('No se pudo cargar la lección. Intenta de nuevo.');
      }
      setLoading(false);
    };
    load();
  }, [courseId, moduleId, lessonId]);

  const handleVideoEnded = useCallback(async () => {
    await completeLesson(Number(lessonId), courseId);
    setCompleted(true);
    toastSuccess('¡Lección completada! Sigue avanzando en el curso.');
    try {
      const prog = await loadCourseProgress(courseId);
      setProgress(prog);
    } catch { /* ignore */ }
  }, [courseId, lessonId, completeLesson, loadCourseProgress, toastSuccess]);

  const handleAskQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.body.trim()) return;
    setAskingQuestion(true);
    try {
      const q = await qnaService.createQuestion(lessonId, newQuestion);
      setQuestions((prev) => [...prev, q]);
      setNewQuestion({ title: '', body: '' });
    } catch (err) {
      console.error('Error posting question:', err);
      setError('No se pudo enviar tu pregunta. Intenta de nuevo.');
    }
    setAskingQuestion(false);
  };

  const requireSequential = course?.require_sequential_progress || progress?.require_sequential_progress;
  const completedIds = progress?.completed_lesson_ids || [];

  const isLessonAccessible = useCallback(() => {
    if (!isEnrolled || !requireSequential) return true;
    const allLessons = [];
    (course?.modules || []).forEach((m) => {
      (m.lessons || []).forEach((l) => allLessons.push({ ...l, moduleId: m.id }));
    });
    const idx = allLessons.findIndex((l) => String(l.id) === String(lessonId));
    if (idx <= 0) return true;
    const prevLesson = allLessons[idx - 1];
    return completedIds.includes(prevLesson.id);
  }, [isEnrolled, requireSequential, completedIds, course?.modules, lessonId]);

  const handleDownloadMaterial = useCallback(async (material) => {
    setDownloadingId(material.id);
    try {
      const blob = await materialService.download(material.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = material.original_filename || material.title || 'material';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading material:', err);
      setError('No se pudo descargar el material. Intenta de nuevo.');
    }
    setDownloadingId(null);
  }, []);

  const getMaterialIcon = (fileType) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return <FileText size={18} className="text-red-500" />;
    if (t === 'pptx' || t === 'ppt') return <FileText size={18} className="text-orange-500" />;
    if (t === 'docx' || t === 'doc') return <FileText size={18} className="text-blue-500" />;
    if (t === 'image') return <Image size={18} className="text-purple-500" />;
    return <File size={18} className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes == null || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const saveVideoPosition = useCallback(async (seconds) => {
    if (seconds == null && playerRef.current?.getCurrentTime) {
      try {
        seconds = Math.floor(playerRef.current.getCurrentTime());
      } catch { return; }
    }
    if (typeof seconds !== 'number' || !currentLesson?.video_url) return;
    try {
      await progressService.updateLessonPosition(lessonId, seconds);
    } catch { /* ignore */ }
  }, [lessonId, currentLesson?.video_url]);

  const goTo = useCallback((pathOrNext) => {
    const doNav = () => {
      if (typeof pathOrNext === 'string') navigate(pathOrNext);
      else if (pathOrNext?.moduleId && pathOrNext?.id) navigate(`/course/${courseId}/lesson/${pathOrNext.moduleId}/${pathOrNext.id}`);
      else navigate(`/course/${courseId}`);
    };
    saveVideoPosition().then(doNav).catch(doNav);
  }, [courseId, navigate, saveVideoPosition]);

  const getNavigation = () => {
    if (!course || !currentModule) return { prev: null, next: null };
    const allLessons = [];
    course.modules.forEach((m) => {
      m.lessons.forEach((l) => allLessons.push({ ...l, moduleId: m.id }));
    });
    const idx = allLessons.findIndex((l) => String(l.id) === String(lessonId));
    return {
      prev: idx > 0 ? allLessons[idx - 1] : null,
      next: idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
    };
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`font-plus-jakarta-sans min-h-screen ${ isC ? 'bg-[#0e0e0c]' : 'bg-surface dark:bg-gray-950' }`}>
        <div className={`sticky top-0 z-30 backdrop-blur-xl border-b px-6 py-4 ${ isC ? 'bg-[#141311]/90 border-[rgba(201,168,76,0.15)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]' : 'bg-white/80 dark:bg-gray-900/80 border-outline-variant/15' }`}>
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <SkeletonLoader className="h-5 w-32" />
            <SkeletonLoader className="h-4 w-40" />
          </div>
        </div>
        <div className="pt-6 pb-12 px-4 sm:px-8 max-w-[1400px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              <div className={`aspect-video rounded-xl animate-pulse ${ isC ? 'bg-[#1f1f1c]' : 'bg-surface-container dark:bg-gray-800' }`} />
              <div className="space-y-3">
                <SkeletonLoader className="h-8 w-3/4" />
                <SkeletonLoader className="h-4 w-full" />
              </div>
              <div className={`p-8 rounded-xl space-y-3 ${ isC ? 'bg-[#1f1f1c]' : 'bg-surface-container-lowest dark:bg-gray-800' }`}>
                <SkeletonLoader lines={4} />
              </div>
            </div>
            <div className="w-full lg:w-[380px]">
              <div className={`rounded-xl p-8 animate-pulse ${ isC ? 'bg-[#1f1f1c]' : 'bg-surface-container-lowest dark:bg-gray-800' }`}>
                <SkeletonLoader className="h-5 w-40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentLesson) {
    return <div className="text-center py-12 text-gray-500">Lección no encontrada</div>;
  }

  const firstMod = course?.modules?.[0];
  const firstLes = firstMod?.lessons?.[0];
  const isPreviewLesson = !isEnrolled && firstMod?.id === Number(moduleId) && firstLes?.id === Number(lessonId);
  if (!isEnrolled && !isPreviewLesson) {
    navigate(`/course/${courseId}`, { replace: true });
    return null;
  }

  const lessonLocked = isEnrolled && requireSequential && !isLessonAccessible();
  if (lessonLocked) {
    return (
      <div className={`font-plus-jakarta-sans min-h-screen flex items-center justify-center p-4 ${ isC ? 'bg-[#0e0e0c]' : 'bg-surface dark:bg-gray-950' }`}>
        <div className={`max-w-md w-full p-8 text-center rounded-2xl shadow-xl border ${ isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 border-outline-variant/10' }`}>
          <Lock size={48} className={`mx-auto mb-4 opacity-60 ${ isC ? 'text-[#8a8578]' : 'text-stitch-primary' }`} />
          <h2 className={`text-xl font-extrabold mb-2 tracking-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface dark:text-white' }`}>Lección bloqueada</h2>
          <p className={`mb-6 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}>Completa la lección anterior para desbloquear esta.</p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className={`px-6 py-3 rounded-full font-bold text-sm border-2 transition-all ${ isC ? 'border-[#c9a84c] text-[#e6c364] hover:bg-[#c9a84c]/20' : 'border-stitch-primary text-stitch-primary hover:bg-stitch-primary hover:text-white' }`}
          >
            Volver al curso
          </button>
        </div>
      </div>
    );
  }

  const { prev, next } = getNavigation();
  const nextAllowed = isEnrolled && next && (!requireSequential || completed);
  const startSeconds = (progress?.lesson_positions && progress.lesson_positions[lessonId]) ? progress.lesson_positions[lessonId] : 0;

  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
    return match ? match[1] : null;
  };
  const getVimeoId = (url) => {
    if (!url) return null;
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };
  const getVideoEmbedUrl = (url, start = 0) => {
    const ytId = getVideoId(url);
    if (ytId) return start > 0 ? `https://www.youtube.com/embed/${ytId}?start=${start}` : `https://www.youtube.com/embed/${ytId}`;
    const vimeoId = getVimeoId(url);
    if (vimeoId) { const base = `https://player.vimeo.com/video/${vimeoId}`; return start > 0 ? `${base}#t=${start}s` : base; }
    return url || '';
  };
  const videoId = getVideoId(currentLesson?.video_url);
  const isYouTube = Boolean(videoId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`font-plus-jakarta-sans min-h-screen ${ isC ? 'bg-[#0e0e0c] text-[#f5f0e8]' : 'bg-surface dark:bg-gray-950 text-on-surface' }`}>

      {/* Glass top bar */}
      <div className={`sticky top-0 z-30 backdrop-blur-xl border-b px-6 py-4 ${ isC ? 'bg-[#141311]/90 border-[rgba(201,168,76,0.15)] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)]' : 'bg-white/80 dark:bg-gray-900/80 border-outline-variant/15 shadow-[0_4px_24px_-4px_rgba(27,28,25,0.06)]' }`}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <button onClick={() => goTo(`/course/${courseId}`)} className="flex items-center gap-2 group" aria-label="Volver al curso">
            <ChevronLeft size={18} className={`group-hover:-translate-x-1 transition-transform ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary' }`} aria-hidden="true" />
            <span className={`font-bold text-sm tracking-wide uppercase ${ isC ? 'text-[#e6c364]' : 'text-stitch-primary' }`}>Volver al curso</span>
          </button>
          <span className={`text-sm font-medium hidden sm:block ${ isC ? 'text-[#d0c5b2]/70' : 'text-on-surface-variant dark:text-gray-400' }`} aria-label={`Módulo actual: ${currentModule?.title}`}>
            {currentModule?.title}
          </span>
        </div>
      </div>

      <main id="main-content" className="pt-6 pb-12 px-4 sm:px-8 max-w-[1400px] mx-auto">

        {/* Error alert */}
        {error && (
          <div role="alert" aria-live="assertive"
            className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center justify-between border border-red-100">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600 font-bold" aria-label="Cerrar error">&times;</button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main Content ──────────────────────────────────────── */}
          <section className="flex-1 space-y-6 min-w-0">

            {/* Video shell */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-on-background dark:bg-black">
              {currentLesson.video_url ? (
                isYouTube ? (
                  <YouTubePlayer
                    videoId={videoId}
                    startSeconds={startSeconds}
                    playerRef={playerRef}
                    onEnded={isEnrolled ? handleVideoEnded : undefined}
                    onProgress={saveVideoPosition}
                    onUnmount={(seconds) => {
                      if (typeof seconds === 'number') progressService.updateLessonPosition(lessonId, seconds).catch(() => {});
                    }}
                  />
                ) : (
                  <iframe
                    src={getVideoEmbedUrl(currentLesson.video_url, startSeconds)}
                    title={currentLesson.title}
                    className="absolute inset-0 w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <p className="text-white/60 text-sm font-medium">Esta lección no tiene video.</p>
                </div>
              )}
            </div>

            {/* Lesson info + nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
              <div className="space-y-1">
                <span className={`text-xs font-bold tracking-[0.1em] uppercase ${ isC ? 'text-[#c9a84c]' : 'text-stitch-primary/60' }`}>{currentModule?.title}</span>
                <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight ${ isC ? 'text-[#e6c364]' : 'text-on-surface dark:text-white' }`}>
                  {currentLesson.title}
                </h1>
                {isPreviewLesson && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                    Vista previa — Inscríbete para acceder al contenido completo.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {isEnrolled && completed && (
                  <span className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${
                    isC ? 'bg-[#c9a84c]/20 text-[#e6c364]' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}>
                    <CheckCircle size={13} aria-hidden="true" /> Completada
                  </span>
                )}
                {nextAllowed ? (
                  <button onClick={() => goTo(next)} aria-label={`Siguiente lección: ${next?.title || 'siguiente'}`}
                    className={`flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all ${
                      isC ? 'bg-[#e6c364] text-[#141311] shadow-[#e6c364]/10 hover:bg-[#c9a84c]' : 'text-white shadow-stitch-primary/20'
                    }`}
                    style={ isC ? {} : { background: 'linear-gradient(135deg, #845400 0%, #ffb347 100%)' } }>
                    Siguiente <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : next && requireSequential && !completed ? (
                  <span className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider opacity-70 cursor-not-allowed select-none ${
                    isC ? 'bg-[#1f1f1c] text-[#8a8578] border border-[rgba(77,70,55,0.3)]' : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant'
                  }`}>
                    Ve el video para continuar
                  </span>
                ) : (
                  <button onClick={() => goTo(`/course/${courseId}`)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm border-2 transition-all ${
                      isC ? 'border-[#c9a84c] text-[#e6c364] hover:bg-[#c9a84c]/20' : 'border-stitch-primary text-stitch-primary hover:bg-stitch-primary hover:text-white'
                    }`}>
                    {isPreviewLesson ? 'Ver curso e inscribirme' : 'Volver al curso'}
                  </button>
                )}
              </div>
            </div>

            {/* Content card */}
            <div className={`p-6 sm:p-8 rounded-xl shadow-sm border ${
              isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)]' : 'bg-surface-container-lowest dark:bg-gray-800 border-outline-variant/10'
            }`}>
              {currentLesson.description && (
                <>
                  <h3 className={`text-lg font-bold mb-3 ${ isC ? 'text-[#e6c364]' : 'text-on-surface dark:text-white' }`}>Sobre esta lección</h3>
                  <p className={`leading-relaxed mb-5 ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}>{currentLesson.description}</p>
                </>
              )}
              {currentLesson.content && (
                <div className={`prose max-w-none text-sm mb-5 ${ isC ? 'prose-invert text-[#d0c5b2]/80 prose-headings:text-[#e6c364] prose-a:text-[#c9a84c]' : 'dark:prose-invert text-on-surface-variant dark:text-gray-300' }`}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.content) }} />
              )}
              {isEnrolled && lessonMaterials.length > 0 && (
                <div className={`flex flex-wrap gap-3 pt-5 border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-outline-variant/10' }`}>
                  {lessonMaterials.map((mat) => (
                    <button key={mat.id} onClick={() => handleDownloadMaterial(mat)} disabled={downloadingId === mat.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                        isC
                          ? 'bg-[#141311] text-[#e6c364] hover:bg-[#141311]/80 border border-[rgba(230,195,100,0.2)]'
                          : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant dark:text-gray-300 hover:bg-surface-container-high dark:hover:bg-gray-600'
                      }`}>
                      <Download size={13} aria-hidden="true" />
                      {downloadingId === mat.id ? 'Descargando...' : mat.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {prev && (
              <button onClick={() => goTo(prev)} aria-label={`Lección anterior: ${prev.title || 'anterior'}`}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isC ? 'text-[#d0c5b2]/70 hover:text-[#e6c364]' : 'text-on-surface-variant dark:text-gray-400 hover:text-stitch-primary'
                }`}>
                <ChevronLeft size={15} aria-hidden="true" />
                Lección anterior: <span className="font-bold">{prev.title}</span>
              </button>
            )}
          </section>

          {/* ── Sidebar: Q&A (always visible) ──────────────────── */}
          <aside aria-label="Preguntas y respuestas" className="w-full lg:w-[380px] flex-shrink-0">
            <div className={`rounded-xl p-6 sm:p-8 shadow-xl sticky top-24 border transition-colors ${
              isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] shadow-black/20' : 'bg-surface-container-lowest dark:bg-gray-800 shadow-on-surface/5 border-outline-variant/10'
            }`}>
              <div className="flex items-center gap-3 mb-7">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isC ? 'bg-[#141311] border border-[rgba(230,195,100,0.3)]' : 'bg-primary-container/20 dark:bg-stitch-primary/10'
                }`}>
                  <MessageSquare size={20} className={isC ? 'text-[#e6c364]' : 'text-stitch-primary'} aria-hidden="true" />
                </div>
                <h2 className={`text-xl font-extrabold tracking-tight ${ isC ? 'text-[#f5f0e8]' : 'text-on-surface dark:text-white' }`}>
                  Preguntas {questions.length > 0 && <span className={isC ? 'text-[#c9a84c]' : 'text-stitch-primary'}>({questions.length})</span>}
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="qna-titulo-input" className={`text-xs font-bold uppercase tracking-widest px-1 ${ isC ? 'text-[#d0c5b2]/60' : 'text-on-surface-variant/70 dark:text-gray-400' }`}>Asunto</label>
                  <input id="qna-titulo-input" type="text" placeholder="Título de tu pregunta..." aria-label="Título de la pregunta"
                    className={`w-full px-5 py-3.5 border border-transparent rounded-xl text-sm outline-none transition-all ${
                      isC
                        ? 'bg-[#141311] text-[#f5f0e8] placeholder:text-[#d0c5b2]/30 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]'
                        : 'bg-surface-container-low dark:bg-gray-700 text-on-surface dark:text-white placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-stitch-primary/30'
                    }`}
                    value={newQuestion.title} onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="qna-cuerpo-textarea" className={`text-xs font-bold uppercase tracking-widest px-1 ${ isC ? 'text-[#d0c5b2]/60' : 'text-on-surface-variant/70 dark:text-gray-400' }`}>Contenido</label>
                  <textarea id="qna-cuerpo-textarea" placeholder="Describe tu duda..." aria-label="Descripción de tu pregunta" rows={4}
                    className={`w-full px-5 py-3.5 border border-transparent rounded-xl text-sm outline-none resize-none transition-all ${
                      isC
                        ? 'bg-[#141311] text-[#f5f0e8] placeholder:text-[#d0c5b2]/30 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]'
                        : 'bg-surface-container-low dark:bg-gray-700 text-on-surface dark:text-white placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-stitch-primary/30'
                    }`}
                    value={newQuestion.body} onChange={(e) => setNewQuestion({ ...newQuestion, body: e.target.value })} />
                </div>
                <button onClick={handleAskQuestion} disabled={askingQuestion || !newQuestion.title.trim() || !newQuestion.body.trim()}
                  className={`w-full py-4 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isC
                      ? 'bg-[#e6c364] text-[#141311] shadow-[#e6c364]/10 hover:bg-[#c9a84c]'
                      : 'text-white shadow-stitch-primary/20 hover:shadow-stitch-primary/40'
                  }`}
                  style={ isC ? {} : { background: 'linear-gradient(135deg, #845400 0%, #ffb347 100%)' } }>
                  {askingQuestion ? 'Enviando...' : 'Preguntar'}
                  {!askingQuestion && <Send size={13} className="ml-0.5" />}
                </button>
              </div>

              {questions.length > 0 && (
                <div className={`mt-8 pt-6 border-t ${ isC ? 'border-[rgba(77,70,55,0.2)]' : 'border-outline-variant/20' }`}>
                  <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-5 ${ isC ? 'text-[#8a8578]' : 'text-stitch-primary' }`}>Dudas de otros alumnos</h3>
                  <div className="space-y-5">
                    {questions.slice(0, 3).map((q) => (
                      <div key={q.id} className="group cursor-pointer">
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase ${
                            isC ? 'bg-[#141311] text-[#c9a84c] border border-[rgba(230,195,100,0.2)]' : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant'
                          }`}>
                            {(q.user_name || 'U').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold transition-colors line-clamp-1 ${
                              isC ? 'text-[#f5f0e8] group-hover:text-[#e6c364]' : 'text-on-surface dark:text-white group-hover:text-stitch-primary'
                            }`}>{q.title}</p>
                            <p className={`text-xs line-clamp-1 mt-0.5 ${ isC ? 'text-[#d0c5b2]/70' : 'text-on-surface-variant/70 dark:text-gray-500' }`}>{q.body}</p>
                          </div>
                        </div>
                        {(q.answers || []).map((a) => (
                          <div key={a.id} className={`ml-11 mt-2 p-2.5 rounded-lg ${ isC ? 'bg-[#141311]/50 border border-[rgba(77,70,55,0.2)]' : 'bg-surface-container dark:bg-gray-700/50' }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium ${ isC ? 'text-[#d0c5b2]/80' : 'text-on-surface-variant dark:text-gray-400' }`}>{a.user_name}</span>
                              {a.is_accepted && <Badge size="sm" variant="accent" className={isC ? 'bg-[#c9a84c]/20 text-[#e6c364] border-none' : ''}>Aceptada</Badge>}
                            </div>
                            <p className={`text-xs ${ isC ? 'text-[#d0c5b2]/70' : 'text-on-surface-variant dark:text-gray-400' }`}>{a.body}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                    {questions.length > 3 && (
                      <p className={`text-xs font-bold uppercase tracking-widest text-center pt-1 ${ isC ? 'text-[#d0c5b2]/50' : 'text-on-surface-variant/60' }`}>
                        + {questions.length - 3} preguntas más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default LessonView;
