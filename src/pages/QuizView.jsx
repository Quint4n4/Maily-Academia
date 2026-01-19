import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Award,
  RotateCcw,
  Home,
  AlertCircle
} from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Badge } from '../components/ui';
import coursesData from '../data/courses';

const QuizView = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { completeQuiz, generateCertificate, hasCertificate } = useProgress();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const course = useMemo(() => {
    return coursesData.find(c => c.id === parseInt(courseId));
  }, [courseId]);

  const module = useMemo(() => {
    return course?.modules.find(m => m.id === parseInt(moduleId));
  }, [course, moduleId]);

  const quiz = module?.quiz;

  const alreadyHasCertificate = useMemo(() => {
    if (!course || !module) return false;
    return hasCertificate(course.id, module.id);
  }, [course, module, hasCertificate]);

  if (!course || !module || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz no encontrado</h2>
          <Button onClick={() => navigate('/dashboard')}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  const questions = quiz.questions;
  const currentQ = questions[currentQuestion];

  const handleSelectAnswer = (questionId, answerIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Calcular resultados
    let correctAnswers = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Guardar resultado
    completeQuiz(course.id, module.id, score, passed);

    // Si aprobó, generar certificado
    if (passed) {
      generateCertificate(course.id, course.title, module.id, module.title);
    }

    setQuizResult({
      score,
      passed,
      correctAnswers,
      totalQuestions: questions.length
    });
    setShowResults(true);
  };

  const handleRetry = () => {
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setQuizResult(null);
  };

  const allAnswered = questions.every(q => selectedAnswers[q.id] !== undefined);

  // Vista de resultados
  if (showResults && quizResult) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="overflow-hidden">
              {/* Header con resultado */}
              <div className={`
                p-8 -mx-6 -mt-6 mb-6
                ${quizResult.passed
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-red-500 to-rose-600'
                }
              `}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className={`
                    w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center
                    ${quizResult.passed ? 'bg-white/20' : 'bg-white/20'}
                  `}
                >
                  {quizResult.passed ? (
                    <Award className="w-12 h-12 text-white" />
                  ) : (
                    <XCircle className="w-12 h-12 text-white" />
                  )}
                </motion.div>

                <h1 className="text-3xl font-bold text-white mb-2">
                  {quizResult.passed ? '¡Felicitaciones!' : 'Sigue intentando'}
                </h1>
                <p className="text-white/80">
                  {quizResult.passed
                    ? 'Has aprobado el quiz exitosamente'
                    : `Necesitas ${quiz.passingScore}% para aprobar`
                  }
                </p>
              </div>

              {/* Puntuación */}
              <div className="mb-8">
                <div className="relative w-40 h-40 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="12"
                    />
                    <motion.circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke={quizResult.passed ? '#22C55E' : '#EF4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: '0 439.8' }}
                      animate={{ strokeDasharray: `${quizResult.score * 4.398} 439.8` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-4xl font-bold text-gray-900">
                        {quizResult.score}%
                      </span>
                      <p className="text-sm text-gray-500">Puntuación</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-8 mt-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-500">{quizResult.correctAnswers}</p>
                    <p className="text-sm text-gray-500">Correctas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">
                      {quizResult.totalQuestions - quizResult.correctAnswers}
                    </p>
                    <p className="text-sm text-gray-500">Incorrectas</p>
                  </div>
                </div>
              </div>

              {/* Certificado */}
              {quizResult.passed && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        ¡Certificado desbloqueado!
                      </p>
                      <p className="text-sm text-gray-600">
                        Has obtenido tu certificado de "{module.title}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!quizResult.passed && (
                  <Button
                    variant="secondary"
                    className="flex-1"
                    icon={RotateCcw}
                    onClick={handleRetry}
                  >
                    Intentar de nuevo
                  </Button>
                )}
                <Button
                  variant={quizResult.passed ? 'primary' : 'secondary'}
                  className="flex-1"
                  icon={quizResult.passed ? Award : Home}
                  onClick={() => quizResult.passed
                    ? navigate('/certificates')
                    : navigate(`/course/${course.id}`)
                  }
                >
                  {quizResult.passed ? 'Ver certificado' : 'Volver al curso'}
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(`/course/${course.id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Salir del quiz</span>
          </button>

          <div className="flex items-center gap-2">
            <Badge variant="primary">
              {currentQuestion + 1} / {questions.length}
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full bg-maily"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Quiz content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Info del quiz */}
        {currentQuestion === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-maily-light/50 border-maily/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-maily mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Quiz: {module.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Necesitas obtener al menos {quiz.passingScore}% para aprobar y obtener tu certificado.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pregunta actual */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className="mb-6">
                <span className="text-sm text-maily font-medium">
                  Pregunta {currentQuestion + 1}
                </span>
                <h2 className="text-xl font-semibold text-gray-900 mt-2">
                  {currentQ.question}
                </h2>
              </div>

              {/* Opciones */}
              <div className="space-y-3">
                {currentQ.options.map((option, index) => {
                  const isSelected = selectedAnswers[currentQ.id] === index;

                  return (
                    <motion.button
                      key={index}
                      onClick={() => handleSelectAnswer(currentQ.id, index)}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all
                        ${isSelected
                          ? 'border-maily bg-maily-light'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'border-maily bg-maily text-white'
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected && <CheckCircle className="w-4 h-4" />}
                        </div>
                        <span className={isSelected ? 'text-maily font-medium' : 'text-gray-700'}>
                          {option}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navegación */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            icon={ArrowLeft}
          >
            Anterior
          </Button>

          {/* Indicadores de preguntas */}
          <div className="hidden sm:flex items-center gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(index)}
                className={`
                  w-8 h-8 rounded-full text-sm font-medium transition-all
                  ${currentQuestion === index
                    ? 'bg-maily text-white'
                    : selectedAnswers[q.id] !== undefined
                      ? 'bg-maily-light text-maily'
                      : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                  }
                `}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered}
              icon={CheckCircle}
            >
              Enviar respuestas
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              icon={ArrowRight}
              iconPosition="right"
            >
              Siguiente
            </Button>
          )}
        </div>

        {/* Advertencia de respuestas pendientes */}
        {currentQuestion === questions.length - 1 && !allAnswered && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-amber-600 mt-4 text-sm"
          >
            Debes responder todas las preguntas antes de enviar
          </motion.p>
        )}
      </div>
    </div>
  );
};

export default QuizView;
