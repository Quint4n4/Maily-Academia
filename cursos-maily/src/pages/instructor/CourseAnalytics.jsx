import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { ChevronLeft, TrendingUp } from 'lucide-react';
import { Card, SkeletonCard } from '../../components/ui';
import instructorService from '../../services/instructorService';
import { getEngagementAnalytics } from '../../services/instructorService';
import courseService from '../../services/courseService';

// Devuelve color según tasa de completación
const completionColor = (rate) => {
  if (rate >= 70) return '#16a34a'; // verde
  if (rate >= 40) return '#d97706'; // amarillo
  return '#dc2626'; // rojo
};

const CustomModuleBar = (props) => {
  const { x, y, width, height, value } = props;
  return <rect x={x} y={y} width={width} height={height} fill={completionColor(value)} rx={4} ry={4} />;
};

const CourseAnalytics = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  // Engagement state
  const [engagement, setEngagement] = useState(null);
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementError, setEngagementError] = useState(false);

  // Ordenamiento tabla lecciones
  const [lessonSort, setLessonSort] = useState('asc'); // asc = peores primero

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

  useEffect(() => {
    const loadEngagement = async () => {
      setEngagementLoading(true);
      setEngagementError(false);
      try {
        const data = await getEngagementAnalytics(courseId);
        setEngagement(data);
      } catch {
        setEngagementError(true);
      }
      setEngagementLoading(false);
    };
    loadEngagement();
  }, [courseId]);

  const moduleChartData = useMemo(() => {
    if (!engagement?.module_completion) return [];
    return engagement.module_completion.map((m) => ({
      name: (m.title || 'Módulo').length > 20 ? (m.title || 'Módulo').slice(0, 18) + '…' : (m.title || 'Módulo'),
      tasa: m.completion_rate ?? 0,
      completados: m.students_completed ?? 0,
      total: m.students_enrolled ?? 0,
    }));
  }, [engagement]);

  const lessonTableData = useMemo(() => {
    if (!engagement?.lesson_completion) return [];
    const sorted = [...engagement.lesson_completion].sort((a, b) => {
      const rateA = a.completion_rate ?? 0;
      const rateB = b.completion_rate ?? 0;
      return lessonSort === 'asc' ? rateA - rateB : rateB - rateA;
    });
    return sorted;
  }, [engagement, lessonSort]);

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
        <Card className="p-6 mb-8">
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

      {/* ── Sección de Engagement por Módulo ──────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp size={20} className="text-maily" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Engagement por módulo</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Datos detallados de completación por módulo y lección a partir del endpoint de engagement.
      </p>

      {engagementLoading ? (
        <div className="grid grid-cols-1 gap-4 mb-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : engagementError ? (
        <Card className="p-6 mb-6">
          <p className="text-red-500 dark:text-red-400 text-sm">No se pudieron cargar los datos de engagement.</p>
        </Card>
      ) : (
        <>
          {/* Gráfica horizontal de completion rate por módulo */}
          {moduleChartData.length > 0 ? (
            <Card className="p-6 mb-6">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Tasa de completación por módulo
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moduleChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(_value, _name, props) => [
                        `${props.payload.completados} de ${props.payload.total} estudiantes completaron este módulo`,
                        'Completación',
                      ]}
                      labelFormatter={(label) => `Módulo: ${label}`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="tasa" name="Tasa %" radius={[0, 4, 4, 0]}>
                      {moduleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={completionColor(entry.tasa)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-600" /> &gt;70% — Alto</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-amber-600" /> 40–70% — Medio</span>
                <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-600" /> &lt;40% — Bajo</span>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos de módulos disponibles.</p>
            </Card>
          )}

          {/* Tabla de lecciones con completion rate */}
          {lessonTableData.length > 0 ? (
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                  Lecciones — Tasa de completación
                </h3>
                <button
                  onClick={() => setLessonSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
                  className="text-xs text-maily hover:underline"
                >
                  Ordenar: {lessonSort === 'asc' ? 'Peores primero ↑' : 'Mejores primero ↓'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium w-8">#</th>
                      <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Lección</th>
                      <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Módulo</th>
                      <th className="text-right py-2 px-2 text-gray-500 dark:text-gray-400 font-medium">Completaciones</th>
                      <th className="text-left py-2 px-2 text-gray-500 dark:text-gray-400 font-medium min-w-[140px]">Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonTableData.map((lesson, idx) => {
                      const rate = lesson.completion_rate ?? 0;
                      return (
                        <tr key={lesson.lesson_id ?? idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-2 px-2 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-2 text-gray-900 dark:text-white font-medium">
                            {lesson.title || 'Lección'}
                          </td>
                          <td className="py-2 px-2 text-gray-500 dark:text-gray-400">
                            {lesson.module_title || '—'}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                            {lesson.students_completed ?? 0}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(rate, 100)}%`,
                                    backgroundColor: completionColor(rate),
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                                {rate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos de lecciones disponibles.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default CourseAnalytics;
