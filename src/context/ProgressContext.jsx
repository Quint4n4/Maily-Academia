import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ProgressContext = createContext(null);

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress debe ser usado dentro de ProgressProvider');
  }
  return context;
};

export const ProgressProvider = ({ children }) => {
  const { user } = useAuth();
  const [progress, setProgress] = useState({
    courses: {},
    certificates: [],
    totalStudyTime: 0,
    streak: 0,
    lastStudyDate: null
  });

  // Cargar progreso del usuario cuando inicie sesión
  useEffect(() => {
    if (user) {
      const savedProgress = localStorage.getItem(`mailyProgress_${user.id}`);
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      } else {
        // Inicializar progreso vacío
        const initialProgress = {
          courses: {},
          certificates: [],
          totalStudyTime: 0,
          streak: 0,
          lastStudyDate: null
        };
        setProgress(initialProgress);
        localStorage.setItem(`mailyProgress_${user.id}`, JSON.stringify(initialProgress));
      }
    }
  }, [user]);

  // Guardar progreso cada vez que cambie
  const saveProgress = (newProgress) => {
    if (user) {
      setProgress(newProgress);
      localStorage.setItem(`mailyProgress_${user.id}`, JSON.stringify(newProgress));
    }
  };

  // Marcar una lección como completada
  const completeLesson = (courseId, moduleId, lessonId) => {
    const newProgress = { ...progress };

    if (!newProgress.courses[courseId]) {
      newProgress.courses[courseId] = {
        modules: {},
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString()
      };
    }

    if (!newProgress.courses[courseId].modules[moduleId]) {
      newProgress.courses[courseId].modules[moduleId] = {
        completedLessons: [],
        quizPassed: false,
        quizScore: null
      };
    }

    const moduleProgress = newProgress.courses[courseId].modules[moduleId];
    if (!moduleProgress.completedLessons.includes(lessonId)) {
      moduleProgress.completedLessons.push(lessonId);
    }

    newProgress.courses[courseId].lastAccessedAt = new Date().toISOString();

    // Actualizar streak
    const today = new Date().toDateString();
    if (newProgress.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (newProgress.lastStudyDate === yesterday.toDateString()) {
        newProgress.streak += 1;
      } else {
        newProgress.streak = 1;
      }
      newProgress.lastStudyDate = today;
    }

    saveProgress(newProgress);
    return newProgress;
  };

  // Completar quiz de un módulo
  const completeQuiz = (courseId, moduleId, score, passed) => {
    const newProgress = { ...progress };

    if (!newProgress.courses[courseId]) {
      newProgress.courses[courseId] = {
        modules: {},
        startedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString()
      };
    }

    if (!newProgress.courses[courseId].modules[moduleId]) {
      newProgress.courses[courseId].modules[moduleId] = {
        completedLessons: [],
        quizPassed: false,
        quizScore: null
      };
    }

    newProgress.courses[courseId].modules[moduleId].quizScore = score;
    newProgress.courses[courseId].modules[moduleId].quizPassed = passed;
    newProgress.courses[courseId].lastAccessedAt = new Date().toISOString();

    saveProgress(newProgress);
    return { newProgress, passed };
  };

  // Generar certificado para un módulo
  const generateCertificate = (courseId, courseTitle, moduleId, moduleTitle) => {
    const certificateId = `cert_${courseId}_${moduleId}_${Date.now()}`;
    const certificate = {
      id: certificateId,
      courseId,
      courseTitle,
      moduleId,
      moduleTitle,
      userName: user?.name || 'Usuario',
      issuedAt: new Date().toISOString(),
      certificateNumber: `MAILY-${Date.now().toString(36).toUpperCase()}`
    };

    const newProgress = { ...progress };

    // Verificar que no exista ya un certificado para este módulo
    const existingCert = newProgress.certificates.find(
      c => c.courseId === courseId && c.moduleId === moduleId
    );

    if (!existingCert) {
      newProgress.certificates.push(certificate);
      saveProgress(newProgress);
    }

    return existingCert || certificate;
  };

  // Obtener progreso de un curso específico
  const getCourseProgress = (courseId, totalModules, lessonsPerModule) => {
    const courseProgress = progress.courses[courseId];
    if (!courseProgress) {
      return { percentage: 0, completedModules: 0, totalModules };
    }

    let totalLessonsCompleted = 0;
    let completedModules = 0;
    let totalLessons = 0;

    Object.keys(lessonsPerModule).forEach(moduleId => {
      const moduleLessons = lessonsPerModule[moduleId];
      totalLessons += moduleLessons;

      const moduleProgress = courseProgress.modules[moduleId];
      if (moduleProgress) {
        totalLessonsCompleted += moduleProgress.completedLessons.length;

        // Un módulo está completo si todas las lecciones y el quiz están completados
        if (moduleProgress.completedLessons.length >= moduleLessons && moduleProgress.quizPassed) {
          completedModules++;
        }
      }
    });

    const percentage = totalLessons > 0
      ? Math.round((totalLessonsCompleted / totalLessons) * 100)
      : 0;

    return { percentage, completedModules, totalModules, totalLessonsCompleted, totalLessons };
  };

  // Verificar si un módulo está completo
  const isModuleComplete = (courseId, moduleId, totalLessons) => {
    const courseProgress = progress.courses[courseId];
    if (!courseProgress) return false;

    const moduleProgress = courseProgress.modules[moduleId];
    if (!moduleProgress) return false;

    return moduleProgress.completedLessons.length >= totalLessons && moduleProgress.quizPassed;
  };

  // Verificar si una lección está completada
  const isLessonComplete = (courseId, moduleId, lessonId) => {
    const courseProgress = progress.courses[courseId];
    if (!courseProgress) return false;

    const moduleProgress = courseProgress.modules[moduleId];
    if (!moduleProgress) return false;

    return moduleProgress.completedLessons.includes(lessonId);
  };

  // Obtener certificados del usuario
  const getCertificates = () => {
    return progress.certificates || [];
  };

  // Verificar si tiene certificado de un módulo
  const hasCertificate = (courseId, moduleId) => {
    return progress.certificates.some(
      c => c.courseId === courseId && c.moduleId === moduleId
    );
  };

  return (
    <ProgressContext.Provider value={{
      progress,
      completeLesson,
      completeQuiz,
      generateCertificate,
      getCourseProgress,
      isModuleComplete,
      isLessonComplete,
      getCertificates,
      hasCertificate
    }}>
      {children}
    </ProgressContext.Provider>
  );
};

export default ProgressContext;
