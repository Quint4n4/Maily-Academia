import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Users, FileText, ArrowRight, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import blogService from '../../services/blogService';
import progressService from '../../services/progressService';
import qnaService from '../../services/qnaService';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [blogCount, setBlogCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [qnaPendingCount, setQnaPendingCount] = useState(0);
  const [questionsPerCourse, setQuestionsPerCourse] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [coursesRes, blogRes, statsRes, qnaRes] = await Promise.all([
          courseService.list({ instructor: user.id }),
          blogService.list(),
          progressService.getInstructorStats().catch(() => ({ total_students: 0 })),
          qnaService.getInstructorStats().catch(() => ({ questions_pending_count: 0, questions_per_course: [] })),
        ]);
        setCourses((coursesRes.results || coursesRes));
        const blogList = blogRes.results || blogRes;
        setBlogCount(blogList.length);
        setTotalStudents(statsRes?.total_students ?? 0);
        setQnaPendingCount(qnaRes?.questions_pending_count ?? 0);
        setQuestionsPerCourse(qnaRes?.questions_per_course ?? []);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [user.id]);

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
      <Card className="p-6">
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
    </div>
  );
};

export default InstructorDashboard;
