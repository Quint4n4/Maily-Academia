import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, MessageSquare, DollarSign, ArrowRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import progressService from '../../services/progressService';
import qnaService from '../../services/qnaService';
import instructorService from '../../services/instructorService';

/**
 * Panel del profesor.
 *
 * Simplificado el 2026-09-17 a peticion de Emanuel: cuatro cifras y una
 * grafica. Se quitaron "Cursos con mas estudiantes", la lista de "Mis Cursos",
 * el acceso a Analisis de Abandono y las tendencias de seis meses, ademas de
 * las cifras de posts del blog y de ventas.
 *
 * Nada de eso se conserva apagado en el archivo: git lo guarda, y el panel del
 * administrador ya arrastra 500 lineas detras de una bandera. Para recuperar
 * cualquier trozo:
 *
 *   git show 62b53b3:cursos-maily/src/pages/instructor/InstructorDashboard.jsx
 */
const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const [questionsPerCourse, setQuestionsPerCourse] = useState([]);
  const [revenue, setRevenue] = useState({ total_revenue: 0, total_sales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, statsRes, qnaRes, revenueRes] = await Promise.all([
          courseService.list({ instructor: user.id }),
          progressService.getInstructorStats().catch(() => ({ total_students: 0 })),
          qnaService.getInstructorStats().catch(() => ({ questions_pending_count: 0, questions_per_course: [] })),
          instructorService.getRevenue().catch(() => ({ total_revenue: 0, total_sales: 0 })),
        ]);
        setCourses(coursesRes.results || coursesRes);
        setTotalStudents(statsRes?.total_students ?? 0);
        setQnaPendingCount(qnaRes?.questions_pending_count ?? 0);
        setQuestionsPerCourse(qnaRes?.questions_per_course ?? []);
        setRevenue(revenueRes || { total_revenue: 0, total_sales: 0 });
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [user.id]);

  const chartQuestionsData = useMemo(() => (
    questionsPerCourse.slice(0, 8).map((c) => ({
      name: (c.course_title || '').length > 20 ? (c.course_title || '').slice(0, 18) + '...' : (c.course_title || 'Curso'),
      preguntas: c.questions_count ?? 0,
      courseId: c.course_id,
    }))
  ), [questionsPerCourse]);

  const metricas = [
    { label: 'Cursos', value: courses.length, icon: BookOpen, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', to: '/instructor/courses' },
    { label: 'Estudiantes', value: totalStudents, icon: Users, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Preguntas pendientes', value: qnaPendingCount, icon: MessageSquare, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', to: '/instructor/qna' },
    {
      label: 'Ingresos totales',
      value: `$${Number(revenue.total_revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    },
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

      {/* Las cuatro cifras, sin tarjeta: solo el icono, la etiqueta y el numero,
          separados por una linea fina. Las dos que llevan a algun sitio son
          botones de verdad --no un div con onClick-- para que el teclado llegue
          a ellas y el lector de pantalla las anuncie como lo que son. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-4 mb-10 lg:divide-x divide-gray-200 dark:divide-gray-700">
        {metricas.map((m, i) => {
          const Icono = m.icon;
          const contenido = (
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                <Icono size={22} />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{m.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{m.value}</p>
              </div>
            </div>
          );
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={i > 0 ? 'lg:pl-6' : ''}
            >
              {m.to ? (
                <button
                  type="button"
                  onClick={() => navigate(m.to)}
                  className="w-full rounded-lg -m-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {contenido}
                </button>
              ) : contenido}
            </motion.div>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare size={20} className="text-amber-500" />
            Preguntas por curso
          </h2>

          {/* El atajo a donde se responden. Cuando hay pendientes lo dice con su
              numero: el profesor no tiene que cruzar la cifra de arriba con esta
              grafica para saber si le toca hacer algo. */}
          <button
            type="button"
            onClick={() => navigate('/instructor/qna')}
            className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors ${
              qnaPendingCount > 0
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
                : 'text-maily hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {qnaPendingCount > 0
              ? `Responder ${qnaPendingCount} ${qnaPendingCount === 1 ? 'pregunta' : 'preguntas'}`
              : 'Ir a Q&A'}
            <ArrowRight size={15} />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Clic en una barra para ir a Q&amp;A</p>

        {chartQuestionsData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartQuestionsData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => (v?.length > 16 ? v.slice(0, 14) + '..' : v)} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
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
  );
};

export default InstructorDashboard;
