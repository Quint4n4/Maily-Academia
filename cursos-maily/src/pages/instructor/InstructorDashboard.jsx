import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, FileText, ArrowRight, MessageSquare, DollarSign, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { Card, SkeletonCard } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import blogService from '../../services/blogService';
import progressService from '../../services/progressService';
import qnaService from '../../services/qnaService';
import instructorService, { getTrendsAnalytics } from '../../services/instructorService';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [blogCount, setBlogCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const [questionsPerCourse, setQuestionsPerCourse] = useState([]);
  const [revenue, setRevenue] = useState({ total_revenue: 0, total_sales: 0 });
  const [loading, setLoading] = useState(true);

  // Tendencias temporales
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);
  const [trendsError, setTrendsError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, blogRes, statsRes, qnaRes, revenueRes] = await Promise.all([
          courseService.list({ instructor: user.id }),
          blogService.list(),
          progressService.getInstructorStats().catch(() => ({ total_students: 0 })),
          qnaService.getInstructorStats().catch(() => ({ questions_pending_count: 0, questions_per_course: [] })),
          instructorService.getRevenue().catch(() => ({ total_revenue: 0, total_sales: 0 })),
        ]);
        setCourses((coursesRes.results || coursesRes));
        const blogList = blogRes.results || blogRes;
        setBlogCount(blogList.length);
        setTotalStudents(statsRes?.total_students ?? 0);
        setQnaPendingCount(qnaRes?.questions_pending_count ?? 0);
        setQuestionsPerCourse(qnaRes?.questions_per_course ?? []);
        setRevenue(revenueRes || { total_revenue: 0, total_sales: 0 });
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [user.id]);

  // Cargar tendencias al montar (sin course_id = todos los cursos)
  useEffect(() => {
    const loadTrends = async () => {
      setTrendsLoading(true);
      setTrendsError(false);
      try {
        const data = await getTrendsAnalytics();
        setTrends(data);
      } catch {
        setTrendsError(true);
      }
      setTrendsLoading(false);
    };
    loadTrends();
  }, []);

  const chartStudentsData = useMemo(() => {
    return [...courses]
      .sort((a, b) => (b.students_count ?? 0) - (a.students_count ?? 0))
      .slice(0, 8)
      .map((c) => ({ name: c.title?.length > 20 ? c.title.slice(0, 18) + '...' : c.title, estudiantes: c.students_count ?? 0, courseId: c.id }));
  }, [courses]);

  const chartQuestionsData = useMemo(() => {
    return questionsPerCourse.slice(0, 8).map((c) => ({
      name: (c.course_title || '').length > 20 ? (c.course_title || '').slice(0, 18) + '...' : (c.course_title || 'Curso'),
      preguntas: c.questions_count ?? 0,
      courseId: c.course_id,
    }));
  }, [questionsPerCourse]);

  const statCards = [
    { label: 'Mis Cursos', value: courses.length, icon: BookOpen, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', to: '/instructor/courses' },
    { label: 'Total Estudiantes', value: totalStudents, icon: Users, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Preguntas pendientes', value: qnaPendingCount, icon: MessageSquare, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', to: '/instructor/qna' },
    { label: 'Posts del Blog', value: blogCount, icon: FileText, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30', to: '/instructor/blog' },
    { label: 'Ingresos totales', value: `$${Number(revenue.total_revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Ventas', value: revenue.total_sales, icon: DollarSign, color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Hola, {user.firstName || user.name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Panel del Profesor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card
              className={`p-6 ${s.to ? 'cursor-pointer hover:ring-2 hover:ring-maily/30 transition-shadow' : ''}`}
              onClick={s.to ? () => navigate(s.to) : undefined}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={20} className="text-maily" />
            Cursos con más estudiantes
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Clic en una barra para ir a Mis Cursos</p>
          {chartStudentsData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStudentsData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => (v?.length > 16 ? v.slice(0, 14) + '..' : v)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => [`${value} estudiantes`, '']}
                    labelFormatter={(label) => (label?.length > 25 ? label.slice(0, 23) + '...' : label)}
                  />
                  <Bar dataKey="estudiantes" fill="#4A90A4" radius={[4, 4, 0, 0]} name="Estudiantes" cursor="pointer" onClick={() => navigate('/instructor/courses')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-8">Aún no tienes cursos con estudiantes.</p>
          )}
        </Card>
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-500" />
            Preguntas por curso
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Clic en una barra para ir a Q&A</p>
          {chartQuestionsData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartQuestionsData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => (v?.length > 16 ? v.slice(0, 14) + '..' : v)} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value) => [`${value} preguntas`, '']}
                    labelFormatter={(label) => (label?.length > 25 ? label.slice(0, 23) + '...' : label)}
                  />
                  <Bar dataKey="preguntas" fill="#d97706" radius={[4, 4, 0, 0]} name="Preguntas" cursor="pointer" onClick={() => navigate('/instructor/qna')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-8">No hay preguntas en tus cursos aún.</p>
          )}
        </Card>
      </div>

      {/* My courses list */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mis Cursos</h2>
          <Link to="/instructor/courses" className="text-maily hover:underline text-sm flex items-center gap-1">
            Gestionar <ArrowRight size={14} />
          </Link>
        </div>
        {courses.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Aún no tienes cursos. Crea tu primer curso.</p>
        ) : (
          <div className="space-y-3">
            {courses.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => navigate('/instructor/courses')}
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{c.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {c.students_count} estudiantes &middot; {c.status === 'published' ? 'Publicado' : 'Borrador'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Acceso rápido a Análisis de Abandono */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <Card
          className="p-5 flex items-center justify-between cursor-pointer hover:ring-2 hover:ring-red-300/40 transition-shadow"
          onClick={() => navigate('/instructor/dropout')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Análisis de Abandono</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Identifica en qué lecciones pierdes estudiantes</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-gray-400" />
        </Card>
      </motion.div>

      {/* Tendencias temporales — últimos 6 meses */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tendencias (últimos 6 meses)</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Inscripciones y completaciones agregadas de todos tus cursos por mes.
      </p>

      {trendsLoading ? (
        <SkeletonCard />
      ) : trendsError ? (
        <Card className="p-6">
          <p className="text-red-500 dark:text-red-400 text-sm">No se pudieron cargar los datos de tendencias.</p>
        </Card>
      ) : !trends || !(trends.monthly_data || trends.data || []).length ? (
        <Card className="p-6">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No hay datos de tendencias disponibles aún.</p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(trends.monthly_data || trends.data || []).map((item) => ({
                  mes: item.month_label || item.month || item.periodo || '',
                  inscripciones: item.enrollments ?? item.inscripciones ?? 0,
                  completaciones: item.completions ?? item.completaciones ?? 0,
                }))}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => {
                    if (!v) return '';
                    // Intentar formatear "YYYY-MM" a "Mes YYYY"
                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const parts = String(v).split('-');
                    if (parts.length === 2) {
                      const m = parseInt(parts[1], 10);
                      return `${meses[m - 1] || parts[1]} ${parts[0]}`;
                    }
                    return v;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value, name) => [value, name === 'inscripciones' ? 'Inscripciones' : 'Completaciones']}
                  labelFormatter={(label) => {
                    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                    const parts = String(label).split('-');
                    if (parts.length === 2) {
                      const m = parseInt(parts[1], 10);
                      return `${meses[m - 1] || parts[1]} ${parts[0]}`;
                    }
                    return label;
                  }}
                />
                <Legend
                  formatter={(value) => value === 'inscripciones' ? 'Inscripciones' : 'Completaciones'}
                />
                <Line
                  type="monotone"
                  dataKey="inscripciones"
                  stroke="#4A90A4"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="inscripciones"
                />
                <Line
                  type="monotone"
                  dataKey="completaciones"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="completaciones"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InstructorDashboard;
