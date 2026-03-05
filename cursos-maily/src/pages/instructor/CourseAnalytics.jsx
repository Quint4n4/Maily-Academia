import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft } from 'lucide-react';
import { Card } from '../../components/ui';
import instructorService from '../../services/instructorService';
import courseService from '../../services/courseService';

const CourseAnalytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, c] = await Promise.all([
          instructorService.getCourseAnalytics(courseId),
          courseService.getById(courseId).catch(() => null),
        ]);
        setAnalytics(a);
        setCourse(c);
      } catch { setAnalytics(null); }
      setLoading(false);
    };
    load();
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!analytics) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No se pudo cargar la analítica del curso.</p>
        <button className="mt-4 text-maily" onClick={() => navigate('/instructor/courses')}>Volver a Mis Cursos</button>
      </div>
    );
  }

  const moduleData = (analytics.module_completion || []).map((m) => ({ name: m.title?.slice(0, 15) || 'Módulo', tasa: m.completion_rate }));
  const dropoutData = (analytics.dropout_points || []).slice(0, 8).map((d) => ({ name: d.title?.slice(0, 20) || 'Lección', abandonos: d.dropout_count }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/instructor/courses')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-maily mb-6"
      >
        <ChevronLeft size={18} /> Volver a Mis Cursos
      </button>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Analytics: {analytics.course?.title || course?.title || 'Curso'}
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Inscritos</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.students_enrolled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Activos (7 días)</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.students_active_last_7d}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Completaron</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.students_completed}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Tasa de completitud</p>
          <p className="text-xl font-bold text-maily">{analytics.completion_rate}%</p>
        </Card>
      </div>

      {analytics.avg_quiz_score != null && (
        <Card className="p-4 mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Puntuación media en quizzes</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.avg_quiz_score}%</p>
        </Card>
      )}

      {moduleData.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completitud por módulo</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Tasa']} />
                <Bar dataKey="tasa" fill="#4A90A4" radius={[4, 4, 0, 0]} name="Tasa %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {dropoutData.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Puntos de abandono</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dropoutData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, 'Abandonos']} />
                <Bar dataKey="abandonos" fill="#d97706" radius={[4, 4, 0, 0]} name="Abandonos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CourseAnalytics;
