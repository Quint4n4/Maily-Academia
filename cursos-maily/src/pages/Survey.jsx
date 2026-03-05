import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSection } from '../context/SectionContext';
import authService from '../services/authService';
import { Card, Button } from '../components/ui';
import categoryService from '../services/categoryService';

const OCCUPATION_OPTIONS = [
  { value: 'student', label: 'Estudiante' },
  { value: 'worker', label: 'Trabajador del área de salud' },
  { value: 'other', label: 'Otro' },
];

// Lista base de temas alineados con categorías de salud (fallback si la API de categorías falla)
const STATIC_INTEREST_OPTIONS = [
  { value: 'medicina-general', label: 'Medicina General' },
  { value: 'enfermeria', label: 'Enfermería' },
  { value: 'odontologia', label: 'Odontología' },
  { value: 'nutricion', label: 'Nutrición' },
  { value: 'psicologia', label: 'Psicología' },
  { value: 'fisioterapia', label: 'Fisioterapia' },
  { value: 'farmacologia', label: 'Farmacología' },
  { value: 'tecnologia-medica', label: 'Tecnología Médica' },
  { value: 'salud-publica', label: 'Salud Pública' },
  { value: 'administracion-hospitalaria', label: 'Administración Hospitalaria' },
];

const Survey = () => {
  const { user, markSurveyCompleted } = useAuth();
  const { getSectionDashboardPath } = useSection();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [occupationType, setOccupationType] = useState('');
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [interestOptions, setInterestOptions] = useState(STATIC_INTEREST_OPTIONS);
  const [otherInterests, setOtherInterests] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'student') {
      navigate(getSectionDashboardPath(user.role), { replace: true });
      return;
    }
    if (user.hasCompletedSurvey) {
      navigate(getSectionDashboardPath(user.role), { replace: true });
    }
  }, [user, navigate, getSectionDashboardPath]);

  // Cargar categorías reales para usar como intereses (sección Longevity 360)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoryService.list({ section: 'longevity-360' });
        const items = (res.results || res).map((cat) => ({
          value: cat.slug,
          label: cat.name,
        }));
        if (items.length) {
          setInterestOptions(items);
        }
      } catch {
        // Si falla, se mantiene la lista estática inicial
      }
    };
    loadCategories();
  }, []);

  const toggleInterest = (value) => {
    setSelectedInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      if (!occupationType) newErrors.occupationType = 'Selecciona una opción';
    }
    if (step === 2) {
      if (selectedInterests.length === 0) {
        newErrors.interests = 'Elige al menos un tema que te interese';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handlePrev = () => {
    setErrors({});
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      await authService.saveSurvey({
        occupation_type: occupationType,
        interests: selectedInterests,
        other_interests: otherInterests,
      });
      markSurveyCompleted();
      navigate(getSectionDashboardPath(user.role), { replace: true });
    } catch {
      setErrors({ submit: 'Ocurrió un error al guardar tu encuesta. Inténtalo de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 px-4 py-10">
      <Card className="w-full max-w-3xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Queremos conocerte mejor
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              Responde esta encuesta corta y te recomendaremos cursos a tu medida.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Paso {step} de 3</span>
            <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-maily rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  1. ¿Cuál es tu ocupación principal?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esto nos ayuda a recomendarte contenidos más relevantes para tu día a día.
                </p>
                <div className="grid sm:grid-cols-3 gap-4 mt-3">
                  {OCCUPATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOccupationType(opt.value)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all ${
                        occupationType === opt.value
                          ? 'border-maily bg-maily/5 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-maily/60 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {opt.label}
                      </span>
                      {occupationType === opt.value && (
                        <span className="inline-flex items-center gap-1 text-xs text-maily font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Seleccionado
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {errors.occupationType && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.occupationType}
                  </p>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  2. ¿Qué temas te interesan más?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Elige los temas sobre los que te gustaría aprender o profundizar.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  {interestOptions.map((opt) => {
                    const active = selectedInterests.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleInterest(opt.value)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                          active
                            ? 'border-maily bg-maily/5 shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 hover:border-maily/60 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {opt.label}
                        </span>
                        {active && (
                          <CheckCircle2 className="w-5 h-5 text-maily flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.interests && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {errors.interests}
                  </p>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  3. ¿Algo más que te gustaría aprender?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cuéntanos si tienes algún interés específico que no aparezca en la lista anterior.
                  Este campo es opcional.
                </p>
                <textarea
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-maily focus:border-maily"
                  placeholder="Ejemplo: cursos de comunicación con pacientes, gestión de tiempo en hospital, etc."
                  value={otherInterests}
                  onChange={(e) => setOtherInterests(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {errors.submit && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className={`inline-flex items-center gap-1 text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
                step === 1
                  ? 'text-gray-400 cursor-default'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            {step < 3 ? (
              <Button type="button" onClick={handleNext} icon={ChevronRight} iconPosition="right">
                Siguiente
              </Button>
            ) : (
              <Button
                type="submit"
                loading={submitting}
                icon={CheckCircle2}
                iconPosition="right"
              >
                Completar encuesta
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Survey;

