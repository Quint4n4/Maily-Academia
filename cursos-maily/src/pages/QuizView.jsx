import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronLeft, Award, RotateCcw } from 'lucide-react';
import { Card, Button, Badge, ProgressBar } from '../components/ui';
import { useProgress } from '../context/ProgressContext';

const QuizView = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { getQuiz, completeQuiz } = useProgress();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getQuiz(moduleId);
        setQuiz(data);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [moduleId]);

  const handleSelectAnswer = (questionId, answerIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    setSubmitting(true);
    // Backend expects {question_id: selected_index} as a dict with string keys
    const formatted = {};
    Object.entries(answers).forEach(([qId, aIdx]) => {
      formatted[String(qId)] = aIdx;
    });
    const res = await completeQuiz(quiz.id, formatted);
    setResult(res);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="text-center max-w-md">
          <p className="text-gray-500 dark:text-gray-400">No se encontró el quiz para este módulo.</p>
          <Button className="mt-4" onClick={() => navigate(`/course/${courseId}`)}>Volver al curso</Button>
        </Card>
      </div>
    );
  }

  const questions = quiz.questions || [];

  // Show results
  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="text-center">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {result.passed ? <CheckCircle size={40} className="text-green-600" /> : <XCircle size={40} className="text-red-500" />}
              </div>
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
              <div className="flex gap-3 justify-center">
                {!result.passed && (
                  <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); setCurrentQuestion(0); }} icon={<RotateCcw size={16} />}>
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

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <ProgressBar value={((currentQuestion + 1) / questions.length) * 100} showLabel={false} size="sm" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pregunta {currentQuestion + 1} de {questions.length}</p>
        </div>

        {q && (
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <Card className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{q.text}</h2>
              <div className="space-y-3">
                {(q.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectAnswer(q.id, i)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      answers[q.id] === i
                        ? 'border-maily bg-maily/5 text-maily'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        answers[q.id] === i ? 'border-maily bg-maily text-white' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-sm font-medium">{typeof opt === 'string' ? opt : opt.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        <div className="flex justify-between">
          <Button variant="secondary" disabled={currentQuestion === 0} onClick={() => setCurrentQuestion((p) => p - 1)} icon={<ChevronLeft size={16} />}>
            Anterior
          </Button>
          {currentQuestion < questions.length - 1 ? (
            <Button disabled={answers[q?.id] === undefined} onClick={() => setCurrentQuestion((p) => p + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} disabled={Object.keys(answers).length < questions.length}>
              Enviar respuestas
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;
