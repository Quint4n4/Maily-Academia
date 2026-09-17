import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, MessageSquare, DollarSign, ArrowRight, Eye } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import progressService from '../../services/progressService';
import qnaService from '../../services/qnaService';
import instructorService, { getCourseViews } from '../../services/instructorService';

const PERIODOS = [
  { value: 'day', label: 'Diario' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
  { value: 'year', label: 'Anual' },
];

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

  // Vistas de los cursos. Periodo aparte del resto del panel porque es lo unico
  // que se recarga al cambiarlo: las cuatro cifras de arriba no dependen de el.
  const [periodo, setPeriodo] = useState('month');
  const [vistas, setVistas] = useState({ series: [], top_courses: [], total_students: 0 });
  const [vistasCargando, setVistasCargando] = useState(true);

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

  // El `setVistasCargando(true)` vive en `cambiarPeriodo`, no aqui: un setState
  // sincrono en el cuerpo de un efecto provoca un render en cascada.
  useEffect(() => {
    let cancelado = false;
    getCourseViews(periodo)
      .then((d) => { if (!cancelado) setVistas(d); })
      .catch(() => { if (!cancelado) setVistas({ series: [], top_courses: [], total_students: 0 }); })
      .finally(() => { if (!cancelado) setVistasCargando(false); });
    // `cancelado` evita que una respuesta lenta de un periodo que ya nadie mira
    // pise la del periodo actual: al pulsar rapido Diario y luego Anual, sin
    // esto puede quedar en pantalla la serie diaria.
    return () => { cancelado = true; };
  }, [periodo]);

  const cambiarPeriodo = (valor) => {
    if (valor === periodo) return;
    setVistasCargando(true);
    setPeriodo(valor);
  };

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

      {/* Alumnos que consumen los cursos. El periodo manda sobre esta grafica
          Y sobre el ranking de al lado: los dos se recargan al cambiarlo. */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Eye size={20} className="text-maily" />
              Alumnos que ven tus cursos
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Alumnos distintos que abrieron o avanzaron alguna lección
              {vistas.total_students > 0 && ` · ${vistas.total_students} en el período`}
            </p>
          </div>
          <div className="flex gap-1.5" role="group" aria-label="Período de la gráfica">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => cambiarPeriodo(p.value)}
                aria-pressed={periodo === p.value}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  periodo === p.value
                    ? 'bg-maily text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {vistasCargando ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-maily border-t-transparent rounded-full animate-spin" />
          </div>
        ) : vistas.series.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vistas.series} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="gradienteAlumnos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90A4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#4A90A4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                {/* Son personas: sin esto el eje muestra 0,5 alumnos. */}
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(v) => [`${v} ${v === 1 ? 'alumno' : 'alumnos'}`, '']}
                />
                <Area type="monotone" dataKey="alumnos" stroke="#4A90A4" strokeWidth={2} fill="url(#gradienteAlumnos)" name="Alumnos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <Eye size={28} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Todavía no hay actividad en este período.
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Aparecerán aquí en cuanto tus alumnos empiecen a ver las lecciones.
            </p>
          </div>
        )}
      </Card>

      {/* Ranking a la izquierda con sitio para los titulos; preguntas a la
          derecha en un cuadrado, que es lo que pidio Emanuel: ocupaba media
          pantalla para una sola barra. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
            <BookOpen size={20} className="text-maily" />
            Tus cursos más vistos
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            En el período seleccionado arriba
          </p>

          {vistas.top_courses.length > 0 ? (
            <div className="space-y-3">
              {vistas.top_courses.map((c, i) => {
                const tope = vistas.top_courses[0].alumnos || 1;
                return (
                  <button
                    key={c.course_id}
                    type="button"
                    onClick={() => navigate('/instructor/courses')}
                    className="w-full text-left group"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate group-hover:text-maily transition-colors">
                        <span className="text-gray-400 mr-2">{i + 1}</span>{c.title}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                        {c.alumnos}
                      </span>
                    </div>
                    {/* Barra proporcional al primero: con dos o tres cursos, un
                        grafico de barras es mas ruido que informacion. */}
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-maily transition-all"
                        style={{ width: `${Math.max(4, (c.alumnos / tope) * 100)}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-8">
              Ningún curso tuvo alumnos activos en este período.
            </p>
          )}
        </Card>

        <Card className="p-5 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-500" />
              Preguntas
            </h2>
            <button
              type="button"
              onClick={() => navigate('/instructor/qna')}
              className={`inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2 py-1 transition-colors shrink-0 ${
                qnaPendingCount > 0
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50'
                  : 'text-maily hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {qnaPendingCount > 0 ? `Responder ${qnaPendingCount}` : 'Ir a Q&A'}
              <ArrowRight size={13} />
            </button>
          </div>

          {chartQuestionsData.length > 0 ? (
            <div className="flex-1 min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartQuestionsData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={(v) => (v?.length > 10 ? v.slice(0, 8) + '..' : v)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(v) => [`${v} preguntas`, '']}
                  />
                  <Bar dataKey="preguntas" fill="#d97706" radius={[4, 4, 0, 0]} name="Preguntas" cursor="pointer" onClick={() => navigate('/instructor/qna')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm text-center min-h-[200px]">
              No hay preguntas en tus cursos aún.
            </p>
          )}
        </Card>
      </div>

    </div>
  );
};

export default InstructorDashboard;
