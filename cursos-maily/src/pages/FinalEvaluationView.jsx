import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronLeft, Clock, AlertTriangle } from 'lucide-react';

import { Card, Button, ProgressBar } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { useToast } from '../context/ToastContext';

const FinalEvaluationView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { getFinalEvaluation, submitFinalEvaluation } = useProgress();

  const { success: toastSuccess, error: toastError } = useToast();
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);
  const autoSubmittedRef = useRef(false);
  // Modal de confirmación de envío
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await getFinalEvaluation(courseId);
      if (res.success) {
        setEvaluation(res.data);
        if (res.data.available_until) {
          const deadline = new Date(res.data.available_until).getTime();
          const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
      } else {
        setError(res.error);
      }
      setLoading(false);
    };
    load();
  }, [courseId, getFinalEvaluation]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || result) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft !== null && timeLeft > 0, result]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && evaluation && !result && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      handleAutoSubmit();
    }
  }, [timeLeft]);

  const handleAutoSubmit = useCallback(async () => {
    if (!evaluation) return;
    setSubmitting(true);
    const formatted = {};
    Object.entries(answers).forEach(([qId, aIdx]) => {
      formatted[String(qId)] = aIdx;
    });
    const res = await submitFinalEvaluation(evaluation.id, formatted);
    if (res.success) {
      setResult(res.data);
    } else {
      setError('El tiempo se agotó. ' + (res.error || ''));
    }
    setSubmitting(false);
  }, [evaluation, answers, submitFinalEvaluation]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (questionId, answerIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  // Solicita confirmación antes de enviar
  const handleRequestSubmit = () => {
    setShowConfirmModal(true);
  };

  const handleSubmit = async () => {
    if (!evaluation) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    const formatted = {};
    Object.entries(answers).forEach(([qId, aIdx]) => {
      formatted[String(qId)] = aIdx;
    });
    const res = await submitFinalEvaluation(evaluation.id, formatted);
    if (res.success) {
      setResult(res.data);
      if (res.data.passed) {
        toastSuccess('¡Evaluación aprobada! Obtuviste ' + res.data.score + '%');
      } else {
        toastError('Evaluación no aprobada. Obtuviste ' + res.data.score + '%.');
      }
    } else {
      setError(res.error);
      toastError(res.error || 'Error al enviar la evaluación.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Cargando evaluación">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="text-center max-w-md">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {error || 'No se encontró la evaluación para este curso.'}
          </p>
          <Button className="mt-2" onClick={() => navigate(`/course/${courseId}`)}>
            Volver al curso
          </Button>
        </Card>
      </div>
    );
  }

  const questions = evaluation.questions || [];

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="text-center">
              {/* Región aria-live para anunciar resultado a lectores de pantalla */}
              <div aria-live="polite" aria-atomic="true">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                    result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                  }`}
                  aria-hidden="true"
                >
                  {result.passed ? (
                    <CheckCircle size={40} className="text-green-600" />
                  ) : (
                    <XCircle size={40} className="text-red-500" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {result.passed ? '¡Evaluación aprobada!' : 'Evaluación no aprobada'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {result.passed
                    ? 'Has aprobado la evaluación final. Tu certificado estará disponible si el curso está completo.'
                    : 'No alcanzaste el puntaje mínimo. Pide a tu profesor que reactive una nueva evaluación si es necesario.'}
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{result.score}%</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Puntaje obtenido</p>
                </div>
                {/* Indicador textual visible de aprobado/reprobado (no solo color, WCAG 1.4.1) */}
                <p className={`text-sm font-semibold mb-6 ${result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {result.passed ? '✓ Aprobado' : '✗ No aprobado'}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
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
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-maily"
            aria-label="Volver al curso"
          >
            <ChevronLeft size={18} aria-hidden="true" /> Volver al curso
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Clock size={16} aria-hidden="true" />
              {evaluation.title || 'Evaluación final'}
            </span>
            {timeLeft !== null && !result && (
              <span
                className={`text-sm font-mono font-bold px-2 py-1 rounded ${
                  timeLeft <= 60 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse' :
                  timeLeft <= 300 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
                aria-live="off"
                aria-label={timeLeft <= 0 ? 'Tiempo agotado' : `Tiempo restante: ${formatTime(timeLeft)}`}
                role="timer"
              >
                {timeLeft <= 0 ? 'Tiempo agotado' : formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>
      </div>

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-8">
        {/* Aviso de tiempo crítico con role="alert" para lectores de pantalla */}
        {timeLeft !== null && timeLeft <= 60 && timeLeft > 0 && !result && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
          >
            <AlertTriangle size={18} aria-hidden="true" />
            <span>Quedan menos de un minuto. Tu evaluación se enviará automáticamente al terminar el tiempo.</span>
          </div>
        )}

        {/* Progreso accesible */}
        <div className="mb-6">
          <ProgressBar
            value={((currentQuestion + 1) / questions.length) * 100}
            showLabel={false}
            size="sm"
            aria-hidden="true"
          />
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
              {/* Título de la pregunta con id para aria-labelledby en opciones */}
              <h2
                id={`eval-pregunta-${q.id}`}
                className="text-lg font-semibold text-gray-900 dark:text-white mb-6"
              >
                {q.text}
              </h2>
              {/* Opciones con role="group" y aria-labelledby */}
              <div
                role="group"
                aria-labelledby={`eval-pregunta-${q.id}`}
                className="space-y-3"
              >
                {(q.options || []).map((opt, i) => {
                  const estaSeleccionado = answers[q.id] === i;
                  const textoOpcion = typeof opt === 'string' ? opt : opt.text;
                  const letraOpcion = String.fromCharCode(65 + i);
                  return (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={estaSeleccionado}
                      aria-label={`Opción ${letraOpcion}: ${textoOpcion}`}
                      onClick={() => handleSelectAnswer(q.id, i)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        estaSeleccionado
                          ? 'border-maily bg-maily/5 text-maily'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            estaSeleccionado ? 'border-maily bg-maily text-white' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          aria-hidden="true"
                        >
                          {letraOpcion}
                        </div>
                        <span className="text-sm font-medium">
                          {textoOpcion}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        <div className="flex justify-between">
          <Button
            variant="secondary"
            disabled={currentQuestion === 0}
            onClick={() => setCurrentQuestion((p) => p - 1)}
            aria-label="Ir a la pregunta anterior"
          >
            Anterior
          </Button>
          {currentQuestion < questions.length - 1 ? (
            <Button
              disabled={answers[q?.id] === undefined}
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
              aria-label="Enviar todas las respuestas de la evaluación"
            >
              Enviar evaluación
            </Button>
          )}
        </div>

        {/* Feedback de error con role="alert" */}
        {error && (
          <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        )}
      </main>

      {/* Modal de confirmación de envío con accesibilidad: role="dialog", aria-modal, aria-labelledby */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eval-confirm-titulo"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full"
          >
            <h2 id="eval-confirm-titulo" className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              ¿Enviar evaluación?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ¿Estás seguro de que quieres enviar la evaluación final? No podrás cambiar tus respuestas.
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

export default FinalEvaluationView;

