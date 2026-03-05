import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, BookOpen, MessageSquare, Send, Lock, Paperclip, Download, FileText, File, Image } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import courseService from '../services/courseService';
import materialService from '../services/materialService';
import { useProgress } from '../context/ProgressContext';
import qnaService from '../services/qnaService';
import progressService from '../services/progressService';
import YouTubePlayer from '../components/YouTubePlayer';

const LessonView = () => {
  const { courseId, moduleId, lessonId } = useParams();
  const navigate = useNavigate();
  const { completeLesson, isLessonComplete, loadCourseProgress } = useProgress();

  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const playerRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Q&A
  const [questions, setQuestions] = useState([]);
  const [showQnA, setShowQnA] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ title: '', body: '' });
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Material de apoyo (Fase 4)
  const [lessonMaterials, setLessonMaterials] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

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
        } catch { /* empty */ }
        try {
          const mats = await materialService.list(courseId, { lesson: lessonId });
          setLessonMaterials(Array.isArray(mats) ? mats : mats.results || []);
        } catch { setLessonMaterials([]); }
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [courseId, moduleId, lessonId]);

  const handleVideoEnded = useCallback(async () => {
    await completeLesson(Number(lessonId));
    setCompleted(true);
    try {
      const prog = await loadCourseProgress(courseId);
      setProgress(prog);
    } catch { /* ignore */ }
  }, [courseId, lessonId, completeLesson, loadCourseProgress]);

  const handleAskQuestion = async () => {
    if (!newQuestion.title.trim() || !newQuestion.body.trim()) return;
    setAskingQuestion(true);
    try {
      const q = await qnaService.createQuestion(lessonId, newQuestion);
      setQuestions((prev) => [...prev, q]);
      setNewQuestion({ title: '', body: '' });
    } catch { /* empty */ }
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
    } catch { /* empty */ }
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

  // Navigation helpers
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock size={48} className="mx-auto mb-4 text-amber-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Lección bloqueada</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Completa la lección anterior para desbloquear esta.</p>
          <Button onClick={() => navigate(`/course/${courseId}`)} variant="secondary">Volver al curso</Button>
        </Card>
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
  const getVideoEmbedUrl = (url, start = 0) => {
    const id = getVideoId(url);
    if (!id) return url || '';
    return start > 0 ? `https://www.youtube.com/embed/${id}?start=${start}` : `https://www.youtube.com/embed/${id}`;
  };
  const videoId = getVideoId(currentLesson?.video_url);
  const isYouTube = Boolean(videoId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => goTo(`/course/${courseId}`)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-maily">
            <ChevronLeft size={18} /> Volver al curso
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{currentModule?.title}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video */}
            {currentLesson.video_url && (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                {isYouTube ? (
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
                    className="w-full h-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                )}
              </div>
            )}

            {/* Title + completed badge (auto when video ends) */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{currentLesson.title}</h1>
                {currentLesson.description && (
                  <p className="text-gray-500 dark:text-gray-400 mt-2">{currentLesson.description}</p>
                )}
                {isPreviewLesson && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">Vista previa. Inscríbete o compra el curso para acceder al contenido completo.</p>
                )}
              </div>
              {isEnrolled && completed && (
                <Badge variant="success" size="sm" className="flex items-center gap-1 whitespace-nowrap">
                  <CheckCircle size={14} /> Completada
                </Badge>
              )}
            </div>

            {/* Content (sanitized to prevent XSS) */}
            {currentLesson.content && (
              <Card className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentLesson.content) }} />
              </Card>
            )}

            {/* Material de apoyo */}
            {isEnrolled && lessonMaterials.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Paperclip size={18} className="text-maily" /> Material de apoyo
                </h3>
                <ul className="space-y-2">
                  {lessonMaterials.map((mat) => (
                    <li
                      key={mat.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                      {getMaterialIcon(mat.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mat.title}</p>
                        {formatFileSize(mat.file_size) && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(mat.file_size)}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownloadMaterial(mat)}
                        disabled={downloadingId === mat.id}
                        icon={downloadingId === mat.id ? null : <Download size={14} />}
                      >
                        {downloadingId === mat.id ? 'Descargando...' : 'Descargar'}
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {prev ? (
                <Button variant="secondary" onClick={() => goTo(prev)} icon={<ChevronLeft size={16} />}>
                  Anterior
                </Button>
              ) : <div />}
              {nextAllowed ? (
                <Button onClick={() => goTo(next)} icon={<ChevronRight size={16} />} iconPosition="right">
                  Siguiente
                </Button>
              ) : next && requireSequential && !completed ? (
                <Button variant="secondary" disabled>
                  Ve el video hasta el final para continuar
                </Button>
              ) : (
                <Button onClick={() => goTo(`/course/${courseId}`)} variant="secondary">
                  {isPreviewLesson ? 'Ver curso e inscribirme' : 'Volver al curso'}
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar - Q&A */}
          <div className="space-y-4">
            <Card>
              <button onClick={() => setShowQnA(!showQnA)} className="flex items-center gap-2 w-full text-left">
                <MessageSquare size={18} className="text-maily" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Preguntas ({questions.length})</h3>
              </button>
            </Card>

            {showQnA && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Ask question */}
                <Card className="space-y-3">
                  <input
                    type="text"
                    placeholder="Título de tu pregunta..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    value={newQuestion.title}
                    onChange={(e) => setNewQuestion({ ...newQuestion, title: e.target.value })}
                  />
                  <textarea
                    placeholder="Describe tu duda..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    value={newQuestion.body}
                    onChange={(e) => setNewQuestion({ ...newQuestion, body: e.target.value })}
                  />
                  <Button size="sm" onClick={handleAskQuestion} loading={askingQuestion} icon={<Send size={14} />}>
                    Preguntar
                  </Button>
                </Card>

                {/* Existing questions */}
                {questions.map((q) => (
                  <Card key={q.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{q.user_name}</span>
                      <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{q.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{q.body}</p>
                    {(q.answers || []).map((a) => (
                      <div key={a.id} className="mt-2 ml-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{a.user_name}</span>
                          {a.is_accepted && <Badge size="sm" variant="accent">Aceptada</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.body}</p>
                      </div>
                    ))}
                  </Card>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonView;
