import { createContext, useContext, useState, useCallback } from 'react';
import progressService from '../services/progressService';
import quizService from '../services/quizService';
import certificateService from '../services/certificateService';
import evaluationService from '../services/evaluationService';

const ProgressContext = createContext(null);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress debe ser usado dentro de ProgressProvider');
  }
  return context;
};

export const ProgressProvider = ({ children }) => {
  const [dashboard, setDashboard] = useState(null);
  const [courseProgressCache, setCourseProgressCache] = useState({});
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [certificates, setCertificates] = useState([]);
  const [finalEvalRequests, setFinalEvalRequests] = useState({});

  // Load the dashboard summary from the API
  const loadDashboard = useCallback(async () => {
    try {
      const data = await progressService.getDashboard();
      setDashboard(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  // Load progress for a specific course
  const loadCourseProgress = useCallback(async (courseId) => {
    try {
      const data = await progressService.getCourseProgress(courseId);
      setCourseProgressCache((prev) => ({ ...prev, [courseId]: data }));
      return data;
    } catch {
      return null;
    }
  }, []);

  // Invalidate cached progress for a course so next load fetches fresh data
  const invalidateCourseProgress = useCallback((courseId) => {
    if (courseId) {
      setCourseProgressCache((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
    }
  }, []);

  // Mark a lesson as complete
  const completeLesson = useCallback(async (lessonId, courseId) => {
    try {
      const data = await progressService.completeLesson(lessonId);
      setCompletedLessons((prev) => new Set([...prev, lessonId]));
      if (courseId) invalidateCourseProgress(courseId);
      return data;
    } catch {
      return null;
    }
  }, [invalidateCourseProgress]);

  // Submit quiz answers and get result
  const completeQuiz = useCallback(async (quizId, answers, courseId) => {
    const data = await quizService.submitAttempt(quizId, answers);
    if (courseId) invalidateCourseProgress(courseId);
    return { score: data.score, passed: data.passed, attempt: data };
  }, [invalidateCourseProgress]);

  // Get quiz for a module
  const getQuiz = useCallback(async (moduleId) => {
    try {
      return await quizService.getByModule(moduleId);
    } catch {
      return null;
    }
  }, []);

  // Load certificates
  const loadCertificates = useCallback(async () => {
    try {
      const data = await certificateService.list();
      const certs = data.results || data;
      setCertificates(certs);
      return certs;
    } catch {
      return [];
    }
  }, []);

  // Claim a certificate for a completed course
  const claimCertificate = useCallback(async (courseId) => {
    try {
      const data = await certificateService.claim(courseId);
      setCertificates((prev) => [...prev, data]);
      return data;
    } catch (error) {
      return { error: error.response?.data?.detail || 'No se pudo reclamar el certificado' };
    }
  }, []);

  // -------------------------------------------------------------------------
  // Final evaluation helpers
  // -------------------------------------------------------------------------

  // Guardar en cache la última solicitud de evaluación por curso
  const cacheFinalEvalRequest = useCallback((courseId, request) => {
    setFinalEvalRequests((prev) => ({
      ...prev,
      [courseId]: request,
    }));
  }, []);

  const getCachedFinalEvalRequest = useCallback(
    (courseId) => finalEvalRequests[courseId] || null,
    [finalEvalRequests],
  );

  // Alumno: cargar estado actual de la solicitud (sin crear una nueva)
  const loadFinalEvalRequest = useCallback(async (courseId) => {
    try {
      const data = await evaluationService.getEvalRequest(courseId);
      cacheFinalEvalRequest(courseId, data);
      return { success: true, data };
    } catch (error) {
      if (error.response?.status === 404) return { success: false, code: 'no_request' };
      return { success: false, error: error.response?.data?.detail };
    }
  }, [cacheFinalEvalRequest]);

  // Alumno: solicitar evaluación final
  const requestFinalEvaluation = useCallback(async (courseId) => {
    try {
      const data = await evaluationService.requestFinalEvaluation(courseId);
      cacheFinalEvalRequest(courseId, data);
      return { success: true, data };
    } catch (error) {
      const detail = error.response?.data?.detail || 'No se pudo solicitar la evaluación final.';
      return { success: false, error: detail, raw: error.response?.data };
    }
  }, [cacheFinalEvalRequest]);

  // Alumno: obtener evaluación final (si está disponible)
  const getFinalEvaluation = useCallback(async (courseId) => {
    try {
      const data = await evaluationService.getFinalEvaluation(courseId);
      return { success: true, data };
    } catch (error) {
      const resData = error.response?.data;
      return {
        success: false,
        error: resData?.detail || 'No se pudo cargar la evaluación final.',
        code: resData?.code,
      };
    }
  }, []);

  // Alumno: enviar respuestas de la evaluación final
  const submitFinalEvaluation = useCallback(async (evaluationId, answers) => {
    try {
      const data = await evaluationService.submitFinalEvaluation(evaluationId, answers);
      return { success: true, data };
    } catch (error) {
      const resData = error.response?.data;
      return {
        success: false,
        error: resData?.detail || 'No se pudo enviar la evaluación.',
        code: resData?.code,
      };
    }
  }, []);

  // Check helpers using cached data
  const isLessonComplete = useCallback(
    (lessonId) => completedLessons.has(lessonId),
    [completedLessons]
  );

  const getCachedProgress = useCallback(
    (courseId) => courseProgressCache[courseId] || null,
    [courseProgressCache]
  );

  return (
    <ProgressContext.Provider value={{
      dashboard,
      certificates,
      completedLessons,
      finalEvalRequests,
      loadDashboard,
      loadCourseProgress,
      getCachedProgress,
      invalidateCourseProgress,
      completeLesson,
      completeQuiz,
      getQuiz,
      loadCertificates,
      claimCertificate,
      // Final evaluation
      loadFinalEvalRequest,
      requestFinalEvaluation,
      getFinalEvaluation,
      submitFinalEvaluation,
      getCachedFinalEvalRequest,
      isLessonComplete,
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export default ProgressContext;
