import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Plus, Trash2, ChevronUp, ChevronDown,
  BookOpen, PlayCircle, Save, Eye, EyeOff, Edit,
  CheckCircle, AlertTriangle, Video, FileText, Paperclip, FileSpreadsheet, Image, File,
} from 'lucide-react';
import { Card, Button, Input, Badge, Modal } from '../../components/ui';
import ImageCropModal from '../../components/ImageCropModal';
import VideoPreview from '../../components/VideoPreview';
import courseService from '../../services/courseService';
import quizService from '../../services/quizService';
import materialService from '../../services/materialService';
import { uploadCourseThumbnail } from '../../services/uploadService';
import evaluationService from '../../services/evaluationService';

const VIDEO_PROVIDERS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'bunny', label: 'Bunny.net' },
  { value: 'cloudflare', label: 'Cloudflare Stream' },
  { value: 'mux', label: 'Mux' },
  { value: 's3', label: 'AWS S3' },
];

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'true_false', label: 'Verdadero y falso' },
  { value: 'matching', label: 'Relacionar palabras' },
  { value: 'word_search', label: 'Sopa de letras' },
];

const CourseBuilder = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Selection state
  const [selectedType, setSelectedType] = useState(null); // 'course' | 'module' | 'lesson'
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  // Edit forms
  const [courseForm, setCourseForm] = useState({});
  const [moduleForm, setModuleForm] = useState({});
  const [lessonForm, setLessonForm] = useState({});

  // Quiz state
  const [quiz, setQuiz] = useState(null);
  const [quizForm, setQuizForm] = useState({ title: '', passing_score: 70 });
  const [questions, setQuestions] = useState([]);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: 0,
    config: {},
  });

  // Final evaluation state
  const [finalEval, setFinalEval] = useState(null);
  const [finalEvalQuestions, setFinalEvalQuestions] = useState([]);
  const [editingFinalQuestion, setEditingFinalQuestion] = useState(null);
  const [finalQuestionForm, setFinalQuestionForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
  });

  // Validation
  const [validation, setValidation] = useState({ valid: true, issues: [] });

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState('');
  const [cropImageFile, setCropImageFile] = useState(null);

  // Material de apoyo (Fase 4)
  const [materialsList, setMaterialsList] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialUploadForm, setMaterialUploadForm] = useState({
    title: '',
    description: '',
    file: null,
    module_id: '',
    lesson_id: '',
    order: 0,
  });
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialError, setMaterialError] = useState('');

  const loadCourse = useCallback(async () => {
    try {
      const data = await courseService.getById(courseId);
      setCourse(data);
      setCourseForm({
        title: data.title,
        description: data.description,
        level: data.level,
        duration: data.duration || '',
        thumbnail: data.thumbnail || '',
        status: data.status,
        price: data.price != null ? Number(data.price) : 0,
        require_sequential_progress: data.require_sequential_progress ?? false,
        requires_final_evaluation: data.requires_final_evaluation ?? false,
        final_evaluation_duration_default: data.final_evaluation_duration_default ?? 60,
      });
      validateCourse(data);
      // Cargar evaluación final para gestión si está activada
      if (data.requires_final_evaluation) {
        try {
          const evalData = await evaluationService.getAdminEvaluation(courseId);
          setFinalEval(evalData);
          setFinalEvalQuestions(evalData.questions || []);
        } catch {
          setFinalEval(null);
          setFinalEvalQuestions([]);
        }
      } else {
        setFinalEval(null);
        setFinalEvalQuestions([]);
      }
      if (!selectedType) {
        setSelectedType('course');
      }
    } catch {
      navigate('/instructor/courses');
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const loadMaterials = useCallback(async () => {
    if (!courseId) return;
    setMaterialsLoading(true);
    try {
      const data = await materialService.list(courseId);
      setMaterialsList(Array.isArray(data) ? data : data.results || []);
    } catch {
      setMaterialsList([]);
    }
    setMaterialsLoading(false);
  }, [courseId]);

  useEffect(() => {
    if (selectedType === 'materials') loadMaterials();
  }, [selectedType, loadMaterials]);

  // --- Validation ---
  const validateCourse = (data) => {
    const issues = [];
    const modules = data.modules || [];
    if (modules.length === 0) {
      issues.push('El curso necesita al menos 1 módulo');
    }
    modules.forEach((m, mi) => {
      if (!m.lessons || m.lessons.length === 0) {
        issues.push(`"${m.title}" no tiene lecciones`);
      }
      (m.lessons || []).forEach((l) => {
        if (!l.video_url) {
          issues.push(`"${l.title}" no tiene video asignado`);
        }
      });
    });
    setValidation({ valid: issues.length === 0, issues });
  };

  // --- Save helpers ---
  const showSaved = (msg = 'Guardado') => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(''), 2000);
  };

  // --- Course ---
  const saveCourseInfo = async () => {
    setSaving(true);
    try {
      await courseService.update(courseId, courseForm);
      showSaved('Curso actualizado');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  const handleThumbnailFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploadError('');
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setThumbnailUploadError('El archivo no puede superar 5 MB.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setThumbnailUploadError('Solo se permiten imágenes (JPEG, PNG, GIF, WebP).');
      return;
    }
    setCropImageFile(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile) => {
    setCropImageFile(null);
    setUploadingThumbnail(true);
    setThumbnailUploadError('');
    try {
      const url = await uploadCourseThumbnail(croppedFile);
      setCourseForm((prev) => ({ ...prev, thumbnail: url }));
    } catch (err) {
      setThumbnailUploadError(err.response?.data?.detail || 'No se pudo subir la imagen.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const togglePublish = async () => {
    const newStatus = course.status === 'published' ? 'draft' : 'published';
    setSaving(true);
    try {
      await courseService.update(courseId, { status: newStatus });
      showSaved(newStatus === 'published' ? 'Curso publicado' : 'Curso despublicado');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  // --- Modules ---
  const addModule = async () => {
    const modules = course.modules || [];
    const newOrder = modules.length + 1;
    setSaving(true);
    try {
      const mod = await courseService.createModule(courseId, {
        title: `Nuevo Módulo ${newOrder}`,
        description: '',
        order: newOrder,
      });
      await loadCourse();
      selectModule(mod.id);
      showSaved('Módulo creado');
    } catch { /* empty */ }
    setSaving(false);
  };

  const selectModule = async (moduleId) => {
    const mod = (course?.modules || []).find((m) => m.id === moduleId);
    if (!mod) return;
    setSelectedType('module');
    setSelectedModuleId(moduleId);
    setSelectedLessonId(null);
    setModuleForm({ title: mod.title, description: mod.description || '' });
    // Load quiz for this module
    try {
      const q = await quizService.getByModule(moduleId);
      setQuiz(q);
      setQuizForm({ title: q.title, passing_score: q.passing_score });
      setQuestions(q.questions || []);
    } catch {
      setQuiz(null);
      setQuizForm({ title: '', passing_score: 70 });
      setQuestions([]);
    }
    setEditingQuestion(null);
  };

  const saveModule = async () => {
    if (!selectedModuleId) return;
    setSaving(true);
    try {
      await courseService.updateModule(selectedModuleId, moduleForm);
      showSaved('Módulo actualizado');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  const deleteModule = async (moduleId) => {
    if (!window.confirm('¿Eliminar este módulo y todas sus lecciones?')) return;
    setSaving(true);
    try {
      await courseService.deleteModule(moduleId);
      if (selectedModuleId === moduleId) {
        setSelectedType('course');
        setSelectedModuleId(null);
      }
      showSaved('Módulo eliminado');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  const moveModule = async (moduleId, direction) => {
    const modules = [...(course.modules || [])];
    const idx = modules.findIndex((m) => m.id === moduleId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= modules.length) return;
    [modules[idx], modules[newIdx]] = [modules[newIdx], modules[idx]];
    const orderedIds = modules.map((m) => m.id);
    try {
      await courseService.reorderModules(courseId, orderedIds);
      await loadCourse();
    } catch { /* empty */ }
  };

  // --- Lessons ---
  const addLesson = async (moduleId) => {
    const mod = (course?.modules || []).find((m) => m.id === moduleId);
    const newOrder = (mod?.lessons || []).length + 1;
    setSaving(true);
    try {
      const les = await courseService.createLesson(moduleId, {
        title: `Nueva Lección ${newOrder}`,
        description: '',
        video_url: '',
        video_provider: 'youtube',
        duration: '',
        order: newOrder,
      });
      await loadCourse();
      selectLesson(moduleId, les.id);
      showSaved('Lección creada');
    } catch { /* empty */ }
    setSaving(false);
  };

  const selectLesson = (moduleId, lessonId) => {
    const mod = (course?.modules || []).find((m) => m.id === moduleId);
    const les = (mod?.lessons || []).find((l) => l.id === lessonId);
    if (!les) return;
    setSelectedType('lesson');
    setSelectedModuleId(moduleId);
    setSelectedLessonId(lessonId);
    setLessonForm({
      title: les.title,
      description: les.description || '',
      video_url: les.video_url || '',
      video_provider: les.video_provider || 'youtube',
      duration: les.duration || '',
    });
  };

  const saveLesson = async () => {
    if (!selectedLessonId) return;
    setSaving(true);
    try {
      await courseService.updateLesson(selectedLessonId, lessonForm);
      showSaved('Lección actualizada');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  const deleteLesson = async (lessonId) => {
    if (!window.confirm('¿Eliminar esta lección?')) return;
    setSaving(true);
    try {
      await courseService.deleteLesson(lessonId);
      if (selectedLessonId === lessonId) {
        setSelectedType('module');
        setSelectedLessonId(null);
      }
      showSaved('Lección eliminada');
      await loadCourse();
    } catch { /* empty */ }
    setSaving(false);
  };

  const moveLesson = async (moduleId, lessonId, direction) => {
    const mod = (course?.modules || []).find((m) => m.id === moduleId);
    if (!mod) return;
    const lessons = [...(mod.lessons || [])];
    const idx = lessons.findIndex((l) => l.id === lessonId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= lessons.length) return;
    [lessons[idx], lessons[newIdx]] = [lessons[newIdx], lessons[idx]];
    const orderedIds = lessons.map((l) => l.id);
    try {
      await courseService.reorderLessons(moduleId, orderedIds);
      await loadCourse();
    } catch { /* empty */ }
  };

  // --- Quiz ---
  const createQuiz = async () => {
    if (!selectedModuleId) return;
    setSaving(true);
    try {
      const mod = modules.find((m) => m.id === selectedModuleId);
      const q = await quizService.create(selectedModuleId, {
        title: `Quiz: ${mod?.title || 'Módulo'}`,
        passing_score: 70,
      });
      setQuiz(q);
      setQuizForm({ title: q.title, passing_score: q.passing_score });
      setQuestions([]);
      showSaved('Quiz creado');
    } catch { /* empty */ }
    setSaving(false);
  };

  const saveQuiz = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      await quizService.update(quiz.id, quizForm);
      showSaved('Quiz actualizado');
    } catch { /* empty */ }
    setSaving(false);
  };

  const deleteQuiz = async () => {
    if (!quiz || !window.confirm('¿Eliminar el quiz y todas sus preguntas?')) return;
    setSaving(true);
    try {
      await quizService.remove(quiz.id);
      setQuiz(null);
      setQuestions([]);
      showSaved('Quiz eliminado');
    } catch { /* empty */ }
    setSaving(false);
  };

  const buildQuestionPayload = () => {
    const { text, question_type, options, correct_answer, config } = questionForm;
    const payload = { text, question_type: question_type || 'multiple_choice', order: questions.length + 1 };
    if (question_type === 'multiple_choice') {
      payload.options = (options || []).filter((o) => (o && o.trim()));
      payload.correct_answer = correct_answer ?? 0;
      payload.config = {};
    } else if (question_type === 'true_false') {
      payload.options = ['Verdadero', 'Falso'];
      payload.correct_answer = correct_answer === 1 ? 1 : 0;
      payload.config = {};
    } else {
      const rawConfig = config || {};
      payload.options = [];
      payload.correct_answer = null;
      // Asegurar que config se guarde correctamente por tipo
      if (question_type === 'word_search') {
        const words = rawConfig.words_to_find ?? rawConfig.words;
        const splitOne = (s) => String(s).split(/[/,\s]+/).map((x) => x.trim()).filter(Boolean);
        const words_to_find = Array.isArray(words)
          ? words.flatMap((w) => splitOne(w))
          : typeof words === 'string'
            ? splitOne(words.replace(/\n/g, ' '))
            : [];
        payload.config = { ...rawConfig, words_to_find, words: words_to_find };
      } else {
        payload.config = rawConfig;
      }
    }
    return payload;
  };

  const addQuestion = async () => {
    if (!quiz) return;
    setSaving(true);
    try {
      const payload = buildQuestionPayload();
      payload.order = questions.length + 1;
      const q = await quizService.addQuestion(quiz.id, payload);
      setQuestions((prev) => [...prev, q]);
      setQuestionForm({ text: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: 0, config: {} });
      setEditingQuestion(null);
      showSaved('Pregunta agregada');
    } catch { /* empty */ }
    setSaving(false);
  };

  const saveQuestion = async (questionId) => {
    setSaving(true);
    try {
      const payload = buildQuestionPayload();
      delete payload.order;
      const updated = await quizService.updateQuestion(questionId, payload);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      setEditingQuestion(null);
      showSaved('Pregunta actualizada');
    } catch { /* empty */ }
    setSaving(false);
  };

  const deleteQuestion = async (questionId) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    setSaving(true);
    try {
      await quizService.removeQuestion(questionId);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      showSaved('Pregunta eliminada');
    } catch { /* empty */ }
    setSaving(false);
  };

  const startEditQuestion = (q) => {
    setEditingQuestion(q.id);
    const qtype = q.question_type || 'multiple_choice';
    const options = qtype === 'true_false' ? ['Verdadero', 'Falso'] : [...(q.options || []), '', '', '', ''].slice(0, 4);
    setQuestionForm({
      text: q.text,
      question_type: qtype,
      options,
      correct_answer: q.correct_answer ?? 0,
      config: q.config && typeof q.config === 'object' ? { ...q.config } : {},
    });
  };

  // --- Final evaluation question helpers ---
  const addFinalQuestion = async () => {
    if (!finalEval) return;
    setSaving(true);
    try {
      const q = await evaluationService.addFinalQuestion(finalEval.id, {
        text: finalQuestionForm.text,
        options: finalQuestionForm.options.filter((o) => o.trim()),
        correct_answer: finalQuestionForm.correct_answer,
        order: finalEvalQuestions.length + 1,
      });
      setFinalEvalQuestions((prev) => [...prev, q]);
      setFinalQuestionForm({ text: '', options: ['', '', '', ''], correct_answer: 0 });
      setEditingFinalQuestion(null);
      showSaved('Pregunta de evaluación agregada');
    } catch {
      // empty
    }
    setSaving(false);
  };

  const saveFinalQuestion = async (questionId) => {
    setSaving(true);
    try {
      const updated = await evaluationService.updateFinalQuestion(questionId, {
        text: finalQuestionForm.text,
        options: finalQuestionForm.options.filter((o) => o.trim()),
        correct_answer: finalQuestionForm.correct_answer,
      });
      setFinalEvalQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      setEditingFinalQuestion(null);
      showSaved('Pregunta de evaluación actualizada');
    } catch {
      // empty
    }
    setSaving(false);
  };

  const deleteFinalQuestion = async (questionId) => {
    if (!window.confirm('¿Eliminar esta pregunta de la evaluación final?')) return;
    setSaving(true);
    try {
      await evaluationService.removeFinalQuestion(questionId);
      setFinalEvalQuestions((prev) => prev.filter((q) => q.id !== questionId));
      showSaved('Pregunta de evaluación eliminada');
    } catch {
      // empty
    }
    setSaving(false);
  };

  const startEditFinalQuestion = (q) => {
    setEditingFinalQuestion(q.id);
    setFinalQuestionForm({
      text: q.text,
      options: [...(q.options || []), '', '', '', ''].slice(0, 4),
      correct_answer: q.correct_answer,
    });
  };

  // --- Material de apoyo ---
  const handleUploadMaterial = async () => {
    const { title, file, module_id, lesson_id, order } = materialUploadForm;
    if (!title.trim() || !file) {
      setMaterialError('Título y archivo son obligatorios.');
      return;
    }
    setMaterialError('');
    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append('title', materialUploadForm.title.trim());
      if (materialUploadForm.description) formData.append('description', materialUploadForm.description);
      formData.append('file', file);
      if (module_id) formData.append('module', module_id);
      if (lesson_id) formData.append('lesson', lesson_id);
      formData.append('order', Number(order) || 0);
      await materialService.upload(courseId, formData);
      setMaterialUploadForm({ title: '', description: '', file: null, module_id: '', lesson_id: '', order: materialsList.length });
      showSaved('Material subido');
      await loadMaterials();
    } catch (err) {
      setMaterialError(err.response?.data?.file?.[0] || err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Error al subir.');
    }
    setUploadingMaterial(false);
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('¿Eliminar este material?')) return;
    try {
      await materialService.remove(materialId);
      showSaved('Material eliminado');
      await loadMaterials();
    } catch { /* empty */ }
  };

  const getMaterialIcon = (fileType) => {
    const t = (fileType || '').toLowerCase();
    if (t === 'pdf') return <FileText size={18} className="text-red-500" />;
    if (t === 'pptx' || t === 'ppt') return <FileText size={18} className="text-orange-500" />;
    if (t === 'docx' || t === 'doc') return <FileText size={18} className="text-blue-500" />;
    if (t === 'xlsx' || t === 'xls') return <FileSpreadsheet size={18} className="text-green-600" />;
    if (t === 'image') return <Image size={18} className="text-purple-500" />;
    return <File size={18} className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes == null || bytes === 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) return null;

  const modules = course.modules || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/instructor/courses')}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-maily"
            >
              <ChevronLeft size={18} /> Mis Cursos
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <h1 className="font-semibold text-gray-900 dark:text-white truncate max-w-xs sm:max-w-md">
              {course.title}
            </h1>
            <Badge variant={course.status === 'published' ? 'primary' : 'secondary'} size="sm">
              {course.status === 'published' ? 'Publicado' : 'Borrador'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {savedMsg && (
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
                >
                  <CheckCircle size={14} /> {savedMsg}
                </motion.span>
              )}
            </AnimatePresence>
            {!validation.valid && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle size={14} /> {validation.issues.length} pendiente{validation.issues.length > 1 ? 's' : ''}
              </div>
            )}
            <Button
              size="sm"
              variant={course.status === 'published' ? 'secondary' : 'primary'}
              onClick={togglePublish}
              loading={saving}
              icon={course.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}
            >
              {course.status === 'published' ? 'Despublicar' : 'Publicar'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* ── Left panel: course structure ────────────────────── */}
          <div className="w-80 flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              {/* Course info selector */}
              <button
                onClick={() => setSelectedType('course')}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${
                  selectedType === 'course'
                    ? 'bg-maily/10 border-2 border-maily text-maily'
                    : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <BookOpen size={18} />
                <div>
                  <p className="font-medium text-sm">Información del curso</p>
                  <p className="text-xs opacity-70">Título, descripción, nivel</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedType('materials')}
                className={`w-full text-left p-3 rounded-xl transition-colors flex items-center gap-3 ${
                  selectedType === 'materials'
                    ? 'bg-maily/10 border-2 border-maily text-maily'
                    : 'bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <Paperclip size={18} />
                <div>
                  <p className="font-medium text-sm">Material de apoyo</p>
                  <p className="text-xs opacity-70">PDFs, presentaciones, documentos</p>
                </div>
              </button>

              {/* Validation checklist */}
              {!validation.valid && (
                <Card className="p-3 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Requisitos para publicar
                  </p>
                  <ul className="space-y-1">
                    {validation.issues.map((issue, i) => (
                      <li key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                        <span className="mt-0.5">-</span> {issue}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Modules list */}
              <div className="space-y-2">
                {modules.map((mod, mi) => (
                  <div key={mod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Module header */}
                    <div
                      className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
                        selectedType === 'module' && selectedModuleId === mod.id
                          ? 'bg-maily/10 border-l-4 border-l-maily'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => selectModule(mod.id)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, -1); }}
                          disabled={mi === 0}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 1); }}
                          disabled={mi === modules.length - 1}
                          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {mod.title}
                        </p>
                        <p className="text-xs text-gray-400">{(mod.lessons || []).length} lecciones</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteModule(mod.id); }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Lessons under this module */}
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {(mod.lessons || []).map((les, li) => (
                        <div
                          key={les.id}
                          className={`flex items-center gap-2 px-3 py-2 pl-8 cursor-pointer text-sm transition-colors ${
                            selectedType === 'lesson' && selectedLessonId === les.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-maily'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          }`}
                          onClick={() => selectLesson(mod.id, les.id)}
                        >
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); moveLesson(mod.id, les.id, -1); }}
                              disabled={li === 0}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp size={10} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); moveLesson(mod.id, les.id, 1); }}
                              disabled={li === (mod.lessons || []).length - 1}
                              className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown size={10} />
                            </button>
                          </div>
                          <PlayCircle size={14} className={les.video_url ? 'text-green-500' : 'text-gray-300'} />
                          <span className="flex-1 truncate">{les.title}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteLesson(les.id); }}
                            className="p-0.5 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addLesson(mod.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 pl-8 text-xs text-maily hover:bg-maily/5 transition-colors"
                      >
                        <Plus size={14} /> Agregar lección
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addModule}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-maily hover:text-maily transition-colors"
                >
                  <Plus size={16} /> Agregar módulo
                </button>
              </div>
            </div>
          </div>

          {/* ── Right panel: edit form ──────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Course info form */}
            {selectedType === 'course' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="course-form">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Información del curso</h2>
                  <div className="space-y-4">
                    <Input
                      label="Título del curso"
                      value={courseForm.title || ''}
                      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily transition-all"
                        value={courseForm.description || ''}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel</label>
                        <select
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          value={courseForm.level || 'beginner'}
                          onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                        >
                          <option value="beginner">Principiante</option>
                          <option value="intermediate">Intermedio</option>
                          <option value="advanced">Avanzado</option>
                        </select>
                      </div>
                      <Input
                        label="Duración estimada"
                        placeholder="Ej: 4 horas"
                        value={courseForm.duration || ''}
                        onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Precio (0 = gratis)"
                      type="number"
                      placeholder="0"
                      min={0}
                      step={0.01}
                      value={courseForm.price ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCourseForm({ ...courseForm, price: v === '' ? 0 : Math.max(0, parseFloat(v) || 0) });
                      }}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <input
                          id="require-seq"
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-maily focus:ring-maily"
                          checked={courseForm.require_sequential_progress || false}
                          onChange={(e) =>
                            setCourseForm({
                              ...courseForm,
                              require_sequential_progress: e.target.checked,
                            })
                          }
                        />
                        <label htmlFor="require-seq" className="text-sm text-gray-700 dark:text-gray-300">
                          Requerir que el alumno vea las lecciones en orden.
                        </label>
                      </div>
                      <div className="flex items-start gap-2">
                        <input
                          id="requires-final-eval"
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-maily focus:ring-maily"
                          checked={courseForm.requires_final_evaluation || false}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            setCourseForm({ ...courseForm, requires_final_evaluation: checked });
                            if (checked && !finalEval) {
                              try {
                                const evalData = await evaluationService.getAdminEvaluation(courseId);
                                setFinalEval(evalData);
                                setFinalEvalQuestions(evalData.questions || []);
                              } catch { /* empty */ }
                            }
                          }}
                        />
                        <label htmlFor="requires-final-eval" className="text-sm text-gray-700 dark:text-gray-300">
                          Requerir evaluación final para otorgar certificado.
                        </label>
                      </div>
                    </div>
                    {courseForm.requires_final_evaluation && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            label="Duración predeterminada de evaluación (minutos)"
                            type="number"
                            min={5}
                            max={7 * 24 * 60}
                            value={courseForm.final_evaluation_duration_default ?? 60}
                            onChange={(e) =>
                              setCourseForm({
                                ...courseForm,
                                final_evaluation_duration_default: Number(e.target.value) || 60,
                              })
                            }
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                            Esta duración se sugiere al aprobar solicitudes en el panel de evaluaciones.
                          </p>
                        </div>

                        {/* Final evaluation questions management */}
                        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <FileText size={16} /> Preguntas de la evaluación final
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Estas preguntas se usarán en la evaluación final que da acceso al certificado.
                          </p>
                          <div className="space-y-3">
                            {finalEvalQuestions.map((q, idx) => (
                              <div key={q.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                {editingFinalQuestion === q.id ? (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Pregunta
                                      </label>
                                      <textarea
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                        value={finalQuestionForm.text}
                                        onChange={(e) =>
                                          setFinalQuestionForm({ ...finalQuestionForm, text: e.target.value })
                                        }
                                      />
                                    </div>
                                    {finalQuestionForm.options.map((opt, oi) => (
                                      <div key={oi} className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setFinalQuestionForm({
                                              ...finalQuestionForm,
                                              correct_answer: oi,
                                            })
                                          }
                                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            finalQuestionForm.correct_answer === oi
                                              ? 'border-green-500 bg-green-500 text-white'
                                              : 'border-gray-300 dark:border-gray-600'
                                          }`}
                                        >
                                          {String.fromCharCode(65 + oi)}
                                        </button>
                                        <input
                                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                          placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...finalQuestionForm.options];
                                            newOpts[oi] = e.target.value;
                                            setFinalQuestionForm({ ...finalQuestionForm, options: newOpts });
                                          }}
                                        />
                                      </div>
                                    ))}
                                    <p className="text-xs text-gray-400">
                                      Haz clic en la letra para marcar la respuesta correcta.
                                    </p>
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingFinalQuestion(null)}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => saveFinalQuestion(q.id)}
                                        loading={saving}
                                        icon={<Save size={12} />}
                                      >
                                        Guardar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                        {idx + 1}. {q.text}
                                      </p>
                                      <div className="space-y-1">
                                        {(q.options || []).map((opt, oi) => (
                                          <p
                                            key={oi}
                                            className={`text-xs flex items-center gap-2 ${
                                              q.correct_answer === oi
                                                ? 'text-green-600 dark:text-green-400 font-medium'
                                                : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                          >
                                            <span
                                              className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center ${
                                                q.correct_answer === oi
                                                  ? 'border-green-500 bg-green-500 text-white'
                                                  : 'border-gray-300'
                                              }`}
                                            >
                                              {String.fromCharCode(65 + oi)}
                                            </span>
                                            {opt}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => startEditFinalQuestion(q)}
                                        className="p-1 text-gray-400 hover:text-maily rounded"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => deleteFinalQuestion(q.id)}
                                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Nueva pregunta de evaluación */}
                          {editingFinalQuestion === 'new' ? (
                            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                  Nueva pregunta
                                </label>
                                <textarea
                                  rows={2}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                  value={finalQuestionForm.text}
                                  onChange={(e) =>
                                    setFinalQuestionForm({ ...finalQuestionForm, text: e.target.value })
                                  }
                                  placeholder="Escribe la pregunta..."
                                />
                              </div>
                              {finalQuestionForm.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFinalQuestionForm({
                                        ...finalQuestionForm,
                                        correct_answer: oi,
                                      })
                                    }
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                      finalQuestionForm.correct_answer === oi
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + oi)}
                                  </button>
                                  <input
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...finalQuestionForm.options];
                                      newOpts[oi] = e.target.value;
                                      setFinalQuestionForm({ ...finalQuestionForm, options: newOpts });
                                    }}
                                  />
                                </div>
                              ))}
                              <p className="text-xs text-gray-400">
                                Haz clic en la letra para marcar la respuesta correcta.
                              </p>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingFinalQuestion(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={addFinalQuestion}
                                  loading={saving}
                                  disabled={!finalQuestionForm.text.trim()}
                                  icon={<Plus size={12} />}
                                >
                                  Agregar pregunta
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingFinalQuestion('new');
                                setFinalQuestionForm({
                                  text: '',
                                  options: ['', '', '', ''],
                                  correct_answer: 0,
                                });
                              }}
                              className="mt-3 w-full flex items-center justify-center gap-2 p-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-maily hover:text-maily transition-colors"
                            >
                              <Plus size={14} /> Agregar pregunta de evaluación
                            </button>
                          )}
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen del curso (thumbnail)</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleThumbnailFile}
                        disabled={uploadingThumbnail}
                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-maily file:text-white hover:file:bg-maily/90"
                      />
                      {uploadingThumbnail && <p className="text-sm text-maily mt-1">Subiendo...</p>}
                      {thumbnailUploadError && <p className="text-sm text-red-500 mt-1">{thumbnailUploadError}</p>}
                      {courseForm.thumbnail && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={courseForm.thumbnail} alt="Preview" className="w-full aspect-video object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => setCourseForm((prev) => ({ ...prev, thumbnail: '' }))}
                            className="text-sm text-gray-500 hover:text-red-500"
                          >
                            Quitar
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={saveCourseInfo} loading={saving} icon={<Save size={16} />}>
                        Guardar cambios
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Module form */}
            {selectedType === 'module' && selectedModuleId && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`module-${selectedModuleId}`}>
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Editar módulo</h2>
                  <div className="space-y-4">
                    <Input
                      label="Título del módulo"
                      value={moduleForm.title || ''}
                      onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción del módulo</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily transition-all"
                        value={moduleForm.description || ''}
                        onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                      />
                    </div>

                    {/* Module summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resumen del módulo</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <PlayCircle size={16} />
                          {(() => {
                            const mod = modules.find((m) => m.id === selectedModuleId);
                            return `${(mod?.lessons || []).length} lecciones`;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Video size={16} />
                          {(() => {
                            const mod = modules.find((m) => m.id === selectedModuleId);
                            const withVideo = (mod?.lessons || []).filter((l) => l.video_url).length;
                            return `${withVideo} con video`;
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="danger" size="sm" onClick={() => deleteModule(selectedModuleId)} icon={<Trash2 size={14} />}>
                        Eliminar módulo
                      </Button>
                      <Button onClick={saveModule} loading={saving} icon={<Save size={16} />}>
                        Guardar módulo
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Quiz management */}
                <Card className="p-6 mt-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={18} /> Quiz del módulo
                  </h2>

                  {!quiz ? (
                    <div className="text-center py-6">
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Este módulo no tiene quiz</p>
                      <Button onClick={createQuiz} size="sm" icon={<Plus size={14} />}>Crear Quiz</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Quiz settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Título del quiz"
                          value={quizForm.title}
                          onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                        />
                        <Input
                          label="Puntaje para aprobar (%)"
                          type="number"
                          min={0}
                          max={100}
                          value={quizForm.passing_score}
                          onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex justify-between">
                        <Button variant="danger" size="sm" onClick={deleteQuiz} icon={<Trash2 size={14} />}>Eliminar quiz</Button>
                        <Button size="sm" onClick={saveQuiz} loading={saving} icon={<Save size={14} />}>Guardar quiz</Button>
                      </div>

                      {/* Questions list */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          Preguntas ({questions.length})
                        </h3>
                        <div className="space-y-3">
                          {questions.map((q, qi) => (
                            <div key={q.id} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                              {editingQuestion === q.id ? (
                                /* Edit mode */
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Pregunta</label>
                                    <textarea
                                      rows={2}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                      value={questionForm.text}
                                      onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo de pregunta</label>
                                    <select
                                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                      value={questionForm.question_type || 'multiple_choice'}
                                      onChange={(e) => {
                                        const qt = e.target.value;
                                        setQuestionForm((prev) => {
                                          const updates = {
                                            question_type: qt,
                                            config: qt === 'multiple_choice' || qt === 'true_false' ? {} : (prev.config || {}),
                                          };
                                          if (qt === 'true_false') {
                                            updates.options = ['Verdadero', 'Falso'];
                                            updates.correct_answer = 0;
                                          }
                                          return { ...prev, ...updates };
                                        });
                                      }}
                                    >
                                      {QUESTION_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  {questionForm.question_type === 'multiple_choice' && questionForm.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setQuestionForm({ ...questionForm, correct_answer: oi })}
                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                          questionForm.correct_answer === oi
                                            ? 'border-green-500 bg-green-500 text-white'
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + oi)}
                                      </button>
                                      <input
                                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                        placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                        value={opt}
                                        onChange={(e) => {
                                          const newOpts = [...questionForm.options];
                                          newOpts[oi] = e.target.value;
                                          setQuestionForm({ ...questionForm, options: newOpts });
                                        }}
                                      />
                                    </div>
                                  ))}
                                  {questionForm.question_type === 'true_false' && (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">La respuesta correcta es:</label>
                                      <div className="flex gap-4">
                                        {['Verdadero', 'Falso'].map((label, idx) => (
                                          <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="radio"
                                              name="true_false"
                                              checked={(questionForm.correct_answer ?? 0) === idx}
                                              onChange={() => setQuestionForm((prev) => ({ ...prev, correct_answer: idx }))}
                                              className="text-maily"
                                            />
                                            <span className="text-sm text-gray-900 dark:text-white">{label}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {questionForm.question_type === 'word_search' && (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Palabras a encontrar (una por línea)</label>
                                      <textarea
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                        placeholder="CELULA\nMITOSIS\nADN"
                                        value={(questionForm.config?.words_to_find || questionForm.config?.words || []).join('\n')}
                                        onChange={(e) => {
                                          const words_to_find = e.target.value
                                            .split(/[\n/]+/)
                                            .flatMap((s) => s.split(',').map((x) => x.trim()))
                                            .filter(Boolean);
                                          setQuestionForm((prev) => ({ ...prev, config: { ...prev.config, words_to_find } }));
                                        }}
                                      />
                                    </div>
                                  )}
                                  {questionForm.question_type === 'matching' && (
                                    <div className="space-y-2">
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Pares (izquierda | derecha, uno por línea)</label>
                                      <textarea
                                        rows={5}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                        placeholder="Corazón | Bombea sangre al cuerpo\nPulmones | Intercambio de gases"
                                        value={(questionForm.config?.pairs || []).map((p) => `${p.left || ''}|${p.right || ''}`).join('\n')}
                                        onChange={(e) => {
                                          const pairs = e.target.value.split('\n').map((line, idx) => {
                                            const [left, right] = line.split('|').map((s) => s.trim());
                                            return { id: idx + 1, left: left || '', right: right || '' };
                                          }).filter((p) => p.left || p.right);
                                          setQuestionForm((prev) => ({ ...prev, config: { ...prev.config, pairs } }));
                                        }}
                                      />
                                    </div>
                                  )}
                                  {questionForm.question_type === 'multiple_choice' && (
                                    <p className="text-xs text-gray-400">Haz clic en la letra para marcar la respuesta correcta</p>
                                  )}
                                  <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(null)}>Cancelar</Button>
                                    <Button size="sm" onClick={() => saveQuestion(q.id)} loading={saving} icon={<Save size={12} />}>Guardar</Button>
                                  </div>
                                </div>
                              ) : (
                                /* View mode */
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {qi + 1}. {q.text}
                                      </p>
                                      <Badge variant="secondary" size="sm">
                                        {QUESTION_TYPES.find((t) => t.value === (q.question_type || 'multiple_choice'))?.label || 'Opción múltiple'}
                                      </Badge>
                                    </div>
                                    {q.question_type === 'multiple_choice' && (
                                      <div className="space-y-1">
                                        {(q.options || []).map((opt, oi) => (
                                          <p key={oi} className={`text-xs flex items-center gap-2 ${
                                            q.correct_answer === oi
                                              ? 'text-green-600 dark:text-green-400 font-medium'
                                              : 'text-gray-500 dark:text-gray-400'
                                          }`}>
                                            <span className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center ${
                                              q.correct_answer === oi ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
                                            }`}>
                                              {String.fromCharCode(65 + oi)}
                                            </span>
                                            {opt}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                    {q.question_type === 'true_false' && (
                                      <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        Respuesta correcta: {(q.correct_answer === 1 ? 'Falso' : 'Verdadero')}
                                      </p>
                                    )}
                                    {q.question_type !== 'multiple_choice' && q.question_type !== 'true_false' && q.config && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Config: {q.question_type}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <button onClick={() => startEditQuestion(q)} className="p-1 text-gray-400 hover:text-maily rounded">
                                      <Edit size={14} />
                                    </button>
                                    <button onClick={() => deleteQuestion(q.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add new question */}
                        {editingQuestion === 'new' ? (
                          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nueva pregunta</label>
                              <textarea
                                rows={2}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                value={questionForm.text}
                                onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                                placeholder="Escribe la pregunta..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo de pregunta</label>
                              <select
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                value={questionForm.question_type || 'multiple_choice'}
                                onChange={(e) => {
                                  const qt = e.target.value;
                                  const updates = { question_type: qt, config: {} };
                                  if (qt === 'true_false') {
                                    updates.options = ['Verdadero', 'Falso'];
                                    updates.correct_answer = 0;
                                  }
                                  setQuestionForm((prev) => ({ ...prev, ...updates }));
                                }}
                              >
                                {QUESTION_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            {questionForm.question_type === 'multiple_choice' && questionForm.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setQuestionForm({ ...questionForm, correct_answer: oi })}
                                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                    questionForm.correct_answer === oi
                                      ? 'border-green-500 bg-green-500 text-white'
                                      : 'border-gray-300 dark:border-gray-600'
                                  }`}
                                >
                                  {String.fromCharCode(65 + oi)}
                                </button>
                                <input
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                  placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                                  value={opt}
                                  onChange={(e) => {
                                    const newOpts = [...questionForm.options];
                                    newOpts[oi] = e.target.value;
                                    setQuestionForm({ ...questionForm, options: newOpts });
                                  }}
                                />
                              </div>
                            ))}
                            {questionForm.question_type === 'true_false' && (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">La respuesta correcta es:</label>
                                <div className="flex gap-4">
                                  {['Verdadero', 'Falso'].map((label, idx) => (
                                    <label key={idx} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name="true_false_new"
                                        checked={(questionForm.correct_answer ?? 0) === idx}
                                        onChange={() => setQuestionForm((prev) => ({ ...prev, correct_answer: idx }))}
                                        className="text-maily"
                                      />
                                      <span className="text-sm text-gray-900 dark:text-white">{label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                            {questionForm.question_type === 'word_search' && (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Palabras a encontrar (una por línea)</label>
                                <textarea
                                  rows={3}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                  placeholder="CELULA\nMITOSIS\nADN"
                                  value={(questionForm.config?.words_to_find || questionForm.config?.words || []).join('\n')}
                                  onChange={(e) => {
                                    const words_to_find = e.target.value
                                      .split(/[\n/]+/)
                                      .flatMap((s) => s.split(',').map((x) => x.trim()))
                                      .filter(Boolean);
                                    setQuestionForm((prev) => ({ ...prev, config: { ...prev.config, words_to_find } }));
                                  }}
                                />
                              </div>
                            )}
                            {questionForm.question_type === 'matching' && (
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Pares (izquierda | derecha, uno por línea)</label>
                                <textarea
                                  rows={5}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                                  placeholder="Corazón | Bombea sangre\nPulmones | Intercambio de gases"
                                  value={(questionForm.config?.pairs || []).map((p) => `${p.left || ''}|${p.right || ''}`).join('\n')}
                                  onChange={(e) => {
                                    const pairs = e.target.value.split('\n').map((line, idx) => {
                                      const [left, right] = line.split('|').map((s) => s.trim());
                                      return { id: idx + 1, left: left || '', right: right || '' };
                                    }).filter((p) => p.left || p.right);
                                    setQuestionForm((prev) => ({ ...prev, config: { ...prev.config, pairs } }));
                                  }}
                                />
                              </div>
                            )}
                            {questionForm.question_type === 'multiple_choice' && (
                              <p className="text-xs text-gray-400">Haz clic en la letra para marcar la respuesta correcta</p>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(null)}>Cancelar</Button>
                              <Button size="sm" onClick={addQuestion} loading={saving} disabled={!questionForm.text.trim()} icon={<Plus size={12} />}>
                                Agregar pregunta
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingQuestion('new');
                              setQuestionForm({ text: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: 0, config: {} });
                            }}
                            className="mt-3 w-full flex items-center justify-center gap-2 p-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 hover:border-maily hover:text-maily transition-colors"
                          >
                            <Plus size={14} /> Agregar pregunta
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Lesson form */}
            {selectedType === 'lesson' && selectedLessonId && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`lesson-${selectedLessonId}`}>
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Editar lección</h2>
                  <div className="space-y-4">
                    <Input
                      label="Título de la lección"
                      value={lessonForm.title || ''}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción de la lección</label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily transition-all"
                        value={lessonForm.description || ''}
                        onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Duración"
                      placeholder="Ej: 15:30"
                      value={lessonForm.duration || ''}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })}
                    />

                    {/* Video section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Video size={16} /> Configuración de video
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proveedor de video</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            value={lessonForm.video_provider || 'youtube'}
                            onChange={(e) => setLessonForm({ ...lessonForm, video_provider: e.target.value })}
                          >
                            {VIDEO_PROVIDERS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                        <Input
                          label="URL del video"
                          placeholder={
                            lessonForm.video_provider === 'youtube'
                              ? 'https://www.youtube.com/watch?v=...'
                              : 'https://...'
                          }
                          value={lessonForm.video_url || ''}
                          onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                        />
                        <VideoPreview url={lessonForm.video_url} provider={lessonForm.video_provider} />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Button variant="danger" size="sm" onClick={() => deleteLesson(selectedLessonId)} icon={<Trash2 size={14} />}>
                        Eliminar lección
                      </Button>
                      <Button onClick={saveLesson} loading={saving} icon={<Save size={16} />}>
                        Guardar lección
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Material de apoyo */}
            {selectedType === 'materials' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key="materials">
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Paperclip size={18} /> Material de apoyo
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Sube PDFs, presentaciones o documentos para que los alumnos los descarguen. Puedes asociar cada archivo al curso, a un módulo o a una lección.
                  </p>

                  {/* Lista de materiales */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Materiales subidos</h3>
                    {materialsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-4 h-4 border-2 border-maily border-t-transparent rounded-full animate-spin" />
                        Cargando...
                      </div>
                    ) : materialsList.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Aún no hay materiales. Sube el primero abajo.</p>
                    ) : (
                      <ul className="space-y-2">
                        {materialsList.map((mat) => (
                          <li
                            key={mat.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                          >
                            {getMaterialIcon(mat.file_type)}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{mat.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(mat.file_size)}
                                {mat.module_title && ` · ${mat.module_title}`}
                                {mat.lesson_title && ` → ${mat.lesson_title}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(mat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Formulario de subida */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Subir material</h3>
                    <div className="space-y-4">
                      <Input
                        label="Título"
                        placeholder="Ej: Guía del módulo 1"
                        value={materialUploadForm.title}
                        onChange={(e) => setMaterialUploadForm((prev) => ({ ...prev, title: e.target.value }))}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción (opcional)</label>
                        <textarea
                          rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          placeholder="Breve descripción del archivo"
                          value={materialUploadForm.description}
                          onChange={(e) => setMaterialUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Archivo (PDF, PPT, DOC, XLS, imágenes — máx. 50 MB)</label>
                        <input
                          type="file"
                          accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-maily file:text-white hover:file:bg-maily/90"
                          onChange={(e) => setMaterialUploadForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                        />
                        {materialUploadForm.file && (
                          <p className="text-xs text-gray-500 mt-1">{materialUploadForm.file.name}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Módulo (opcional)</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            value={materialUploadForm.module_id}
                            onChange={(e) => setMaterialUploadForm((prev) => ({ ...prev, module_id: e.target.value, lesson_id: '' }))}
                          >
                            <option value="">Todo el curso</option>
                            {(course?.modules || []).map((m) => (
                              <option key={m.id} value={m.id}>{m.title}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lección (opcional)</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            value={materialUploadForm.lesson_id}
                            onChange={(e) => setMaterialUploadForm((prev) => ({ ...prev, lesson_id: e.target.value }))}
                          >
                            <option value="">—</option>
                            {materialUploadForm.module_id &&
                              (() => {
                                const mod = (course?.modules || []).find((m) => String(m.id) === String(materialUploadForm.module_id));
                                return (mod?.lessons || []).map((l) => (
                                  <option key={l.id} value={l.id}>{l.title}</option>
                                ));
                              })()}
                          </select>
                        </div>
                      </div>
                      {materialError && <p className="text-sm text-red-500">{materialError}</p>}
                      <Button
                        onClick={handleUploadMaterial}
                        loading={uploadingMaterial}
                        disabled={!materialUploadForm.title.trim() || !materialUploadForm.file}
                        icon={<Plus size={16} />}
                      >
                        Subir material
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      <ImageCropModal
        isOpen={!!cropImageFile}
        imageFile={cropImageFile}
        onComplete={handleCropComplete}
        onCancel={() => setCropImageFile(null)}
      />
    </div>
  );
};

export default CourseBuilder;
