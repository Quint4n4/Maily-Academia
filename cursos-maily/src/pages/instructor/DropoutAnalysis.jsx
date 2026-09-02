import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Users, CheckCircle, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card, SkeletonCard } from '../../components/ui';
import { getDropoutAnalytics } from '../../services/instructorService';
import courseService from '../../services/courseService';
import { useAuth } from '../../context/AuthContext';

// Badge de severidad para puntos críticos
const SeverityBadge = ({ rate }) => {
  if (rate >= 50) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Crítico
      </span>
    );
  }
  if (rate >= 25) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        Alto
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
      Moderado
    </span>
  );
};

const DropoutAnalysis = () => {
  const { user } = useAuth();

  // Cursos del instructor
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('');

  // Datos de dropout
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Cargar cursos del instructor
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await courseService.list({ instructor: user.id });
        const list = res.results || res;
        setCourses(list);
        if (list.length > 0) setSelectedCourse(String(list[0].id));
      } catch { /* silencioso */ }
      setCoursesLoading(false);
    };
    loadCourses();
  }, [user.id]);

  // Cargar dropout data cuando cambia el curso seleccionado
  useEffect(() => {
    if (!selectedCourse) return;
    const loadDropout = async () => {
      setLoading(true);
      setError(false);
      setData(null);
      try {
        const res = await getDropoutAnalytics(selectedCourse);
        setData(res);
      } catch {
        setError(true);
      }
      setLoading(false);
    };
    loadDropout();
  }, [selectedCourse]);

  // Datos del funnel (AreaChart): cuántos estudiantes llegaron a cada lección
  const funnelData = useMemo(() => {
    if (!data?.lesson_funnel) return [];
    return data.lesson_funnel.map((item, idx) => ({
      name: `L${idx + 1}`,
      fullName: item.title || `Lección ${idx + 1}`,
      estudiantes: item.students_reached ?? 0,
    }));
  }, [data]);

  // Puntos críticos ordenados por dropout_rate desc
  const criticalPoints = useMemo(() => {
    if (!data?.dropout_points) return [];
    return [...data.dropout_points].sort((a, b) => (b.dropout_rate ?? 0) - (a.dropout_rate ?? 0));
  }, [data]);

  // Mayor punto de abandono
  const worstPoint = criticalPoints[0] ?? null;

  // Métricas de resumen
  const totalEnrolled = data?.total_enrolled ?? 0;
  const totalCompleted = data?.total_completed ?? 0;
  const dropoutRate = totalEnrolled > 0
    ? (((totalEnrolled - totalCompleted) / totalEnrolled) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown size={24} className="text-red-500" />
            Análisis de Abandono
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Identifica en qué punto los estudiantes abandonan tus cursos
          </p>
        </div>

        {/* Selector de curso */}
        {coursesLoading ? (
          <div className="w-48 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No tienes cursos aún.</p>
        ) : (
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-maily/50 min-w-[220px]"
          >
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title?.length > 40 ? c.title.slice(0, 38) + '…' : c.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Empty state si no hay curso seleccionado */}
      {!selectedCourse && !coursesLoading && (
        <Card className="p-10 text-center">
          <TrendingDown size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Selecciona un curso para ver el análisis</p>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="p-8 text-center">
          <p className="text-red-500 dark:text-red-400">No se pudieron cargar los datos. Intenta de nuevo.</p>
        </Card>
      )}

      {/* Contenido principal */}
      {data && !loading && !error && (
        <>
          {/* Cards de resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total inscritos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalEnrolled}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total completaron</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCompleted}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown size={20} className="text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tasa de abandono global</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dropoutRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Alerta del mayor punto de abandono */}
          {worstPoint && (
            <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-semibold">Mayor punto de abandono:</span>{' '}
                <span className="font-medium">{worstPoint.title || 'Lección desconocida'}</span>
                {' '}— el{' '}
                <span className="font-bold">{(worstPoint.dropout_rate ?? 0).toFixed(1)}%</span>{' '}
                de los estudiantes no continúan después de esta lección.
              </p>
            </div>
          )}

          {/* Gráfica de funnel (AreaChart) */}
          {funnelData.length > 0 ? (
            <Card className="p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Funnel de progreso por lección
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Muestra cuántos estudiantes completaron cada lección. El área decreciente indica abandono acumulado.
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={funnelData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <defs>
                      <linearGradient id="colorFunnel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A90A4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4A90A4" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      label={{ value: 'Lección', position: 'insideBottomRight', offset: -4, fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value, _name, props) => [
                        `${value} estudiantes`,
                        props.payload?.fullName || 'Lección',
                      ]}
                      labelFormatter={(label) => `Posición: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="estudiantes"
                      stroke="#4A90A4"
                      strokeWidth={2}
                      fill="url(#colorFunnel)"
                      name="Estudiantes"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          ) : (
            <Card className="p-6 mb-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos de funnel disponibles.</p>
            </Card>
          )}

          {/* Tabla de puntos críticos */}
          {criticalPoints.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Puntos críticos de abandono
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
                      <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Lección</th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Abandonos</th>
                      <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Tasa</th>
                      <th className="text-center py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Severidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalPoints.map((point, idx) => {
                      const rate = point.dropout_rate ?? 0;
                      return (
                        <tr
                          key={point.lesson_id ?? idx}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="py-2 px-3 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                          <td className="py-2 px-3 text-gray-900 dark:text-white font-medium">
                            {point.title || 'Lección'}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                            {point.dropout_count ?? 0}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-red-600 dark:text-red-400">
                            {rate.toFixed(1)}%
                          </td>
                          <td className="py-2 px-3 text-center">
                            <SeverityBadge rate={rate} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No se encontraron puntos críticos de abandono.</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DropoutAnalysis;
