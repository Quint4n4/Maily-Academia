import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronLeft, Award, RotateCcw } from 'lucide-react';
import { Card, Button, ProgressBar } from '../components/ui';
import QuizRenderer from '../components/quiz/QuizRenderer';
import { useProgress } from '../context/ProgressContext';
import { useToast } from '../context/ToastContext';

const QuizView = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { getQuiz, completeQuiz } = useProgress();

  const { success: toastSuccess, error: toastError } = useToast();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Modal de confirmación de envío
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuiz(moduleId);
        setQuiz(data);
      } catch (err) {
        console.error('Error loading quiz:', err);
        setError('No se pudo cargar el quiz. Intenta de nuevo.');
      }
      setLoading(false);
    };
    load();
  }, [moduleId]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Solicita confirmación antes de enviar
  const handleRequestSubmit = () => {
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    const formatted = {};
    Object.entries(answers).forEach(([qId, val]) => {
      formatted[String(qId)] = val;
    });
    try {
      const res = await completeQuiz(quiz.id, formatted, courseId);
      setResult(res);
      if (res.passed) {
        toastSuccess('¡Quiz aprobado! Obtuviste ' + res.score + '%');
      } else {
        toastError('No aprobado. Obtuviste ' + res.score + '%. Puedes reintentar.');
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      const msg = err.response?.data?.detail || 'Error al enviar el quiz. Intenta de nuevo.';
      setError(msg);
      toastError(msg);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Cargando quiz">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center max-w-md">
          <p className="text-gray-500 dark:text-gray-400">{error || 'No se encontró el quiz para este módulo.'}</p>
          <Button className="mt-4" onClick={() => navigate(`/course/${courseId}`)}>Volver al curso</Button>
        </Card>
      </div>
    );
  }

  const questions = quiz.questions || [];

  // Mostrar resultados con aria-live para anunciar al usuario de lectores de pantalla
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="text-center">
              {/* Región aria-live para anunciar resultado a lectores de pantalla */}
              <div aria-live="polite" aria-atomic="true">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
                  aria-hidden="true"
                >
                  {result.passed ? <CheckCircle size={40} className="text-green-600" /> : <XCircle size={40} className="text-red-500" />}
                </div>
                {result.passed && (
                  <div className="flex justify-center mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 text-sm font-medium">
                      <CheckCircle size={16} aria-hidden="true" /> Quiz completado
                    </span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {result.passed ? '¡Felicidades!' : 'No aprobado'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {result.passed
                    ? 'Has aprobado el quiz exitosamente'
                    : 'No alcanzaste el puntaje mínimo. Inténtalo de nuevo.'}
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{result.score}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Puntaje obtenido</p>
                </div>
                {/* Indicador textual visible de aprobado/reprobado (no solo color) */}
                <p className={`text-sm font-semibold mb-4 ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {result.passed ? '✓ Aprobado' : '✗ No aprobado'}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                {!result.passed && (
                  <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); setCurrentQuestion(0); }} icon={<RotateCcw size={16} aria-hidden="true" />}>
                    Reintentar
                  </Button>
                )}
                <Button onClick={() => navigate(`/course/${courseId}`)}>Volver al curso</Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const q = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(`/course/${courseId}`)} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-maily">
            <ChevronLeft size={18} /> Volver al curso
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{quiz.title}</span>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {/* Progreso accesible con aria-live */}
        <div className="mb-6">
          <ProgressBar value={((currentQuestion + 1) / questions.length) * 100} showLabel={false} size="sm" aria-hidden="true" />
          <p
            className="text-sm text-gray-500 dark:text-gray-400 mt-2"
            aria-live="polite"
            aria-atomic="true"
          >
            Pregunta {currentQuestion + 1} de {questions.length}
          </p>
        </div>

        {q && (
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="mb-6">
              {/* ID visible para que los componentes hijos usen aria-labelledby */}
              <h2 id={`quiz-pregunta-${q.id}`} className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{q.text}</h2>
              <QuizRenderer
                question={q}
                value={answers[q.id]}
                onChange={(value) => handleAnswerChange(q.id, value)}
                disabled={false}
              />
            </Card>
          </motion.div>
        )}

        {/* Feedback de error con role="alert" para lectores de pantalla */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <Button
            variant="secondary"
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((p) => p - 1)}
            icon={<ChevronLeft size={16} aria-hidden="true" />}
            aria-label="Ir a la pregunta anterior"
          >
            Anterior
          </Button>
          {currentQuestion < questions.length - 1 ? (
            <Button
              disabled={answers[q?.id] === undefined && (q?.question_type === 'multiple_choice' || !q?.question_type)}
              onClick={() => setCurrentQuestion((p) => p + 1)}
              aria-label="Ir a la siguiente pregunta"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              onClick={handleRequestSubmit}
              loading={submitting}
              disabled={Object.keys(answers).length < questions.length}
              aria-label="Enviar todas las respuestas del quiz"
            >
              Enviar respuestas
            </Button>
          )}
        </div>
      </main>

      {/* Modal de confirmación de envío con accesibilidad: role="dialog", aria-modal, aria-labelledby */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-confirm-titulo"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full"
          >
            <h2 id="quiz-confirm-titulo" className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              ¿Enviar respuestas?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ¿Estás seguro de que quieres enviar el quiz? No podrás cambiar tus respuestas.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirmModal(false)}
              >
                Revisar respuestas
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                loading={submitting}
              >
                Sí, enviar
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default QuizView;
