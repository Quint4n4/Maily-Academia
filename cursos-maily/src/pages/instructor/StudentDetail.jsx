import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, User, BookOpen, Award, Activity, FileCheck } from 'lucide-react';
import { Card, Button } from '../../components/ui';
import instructorService from '../../services/instructorService';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [activity, setActivity] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [tab, setTab] = useState('resumen');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, a, c] = await Promise.all([
          instructorService.getStudentDetail(id),
          instructorService.getStudentActivity(id).catch(() => []),
          instructorService.getStudentCertificates(id).catch(() => []),
        ]);
        setDetail(d);
        setActivity(Array.isArray(a) ? a : []);
        setCertificates(Array.isArray(c) ? c : []);
      } catch { setDetail(null); }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Alumno no encontrado.</p>
        <Button className="mt-4" onClick={() => navigate('/instructor/students')}>Volver a Mis Alumnos</Button>
      </div>
    );
  }

  const { student, summary, courses } = detail;
  const tabs = [
    { id: 'resumen', label: 'Resumen', icon: User },
    { id: 'progreso', label: 'Progreso', icon: BookOpen },
    { id: 'certificados', label: 'Certificados', icon: Award },
    { id: 'actividad', label: 'Actividad', icon: Activity },
    { id: 'proyectos', label: 'Proyectos', icon: FileCheck },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/instructor/students')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-maily mb-6"
      >
        <ChevronLeft size={18} /> Volver a Mis Alumnos
      </button>

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-maily/20 flex items-center justify-center text-2xl font-bold text-maily flex-shrink-0">
          {(student.name || student.email || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name || student.email}</h1>
          <p className="text-gray-500 dark:text-gray-400">{student.email}</p>
          {student.country && <p className="text-sm text-gray-500">{student.country}</p>}
          <p className="text-xs text-gray-400 mt-1">Inscrito desde {student.date_joined ? new Date(student.date_joined).toLocaleDateString() : '-'}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === t.id
                ? 'bg-maily text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Cursos inscritos', value: summary.courses_enrolled },
            { label: 'Cursos completados', value: summary.courses_completed },
            { label: 'Lecciones completadas', value: summary.lessons_completed },
            { label: 'Quizzes aprobados', value: summary.quizzes_passed },
            { label: 'Certificados', value: summary.certificates_earned },
            { label: 'Puntuación media quiz', value: summary.avg_quiz_score != null ? `${summary.avg_quiz_score}%` : '-' },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'resumen' && activity.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Actividad reciente</h3>
          <ul className="space-y-2">
            {activity.slice(0, 10).map((a, i) => (
              <li key={i} className="text-sm text-gray-600 dark:text-gray-400">
                {a.action} — {new Date(a.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'progreso' && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Curso</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Progreso</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Lecciones</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Quizzes</th>
              </tr>
            </thead>
            <tbody>
              {(courses || []).map((c) => (
                <tr key={c.course_id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">{c.course_title}</td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-medium text-maily">{c.progress_percent}%</span>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {c.lessons_completed}/{c.lessons_total}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                    {c.quizzes_passed}/{c.quizzes_total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'certificados' && (
        <Card className="p-6">
          {certificates.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Aún no tiene certificados en tus cursos.</p>
          ) : (
            <ul className="space-y-3">
              {certificates.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <span className="font-medium text-gray-900 dark:text-white">{c.course_title}</span>
                  <span className="text-xs text-gray-500">{new Date(c.issued_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'actividad' && (
        <Card className="p-6">
          {activity.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No hay actividad registrada.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a, i) => (
                <li key={i} className="text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="font-medium text-gray-900 dark:text-white">{a.action}</span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'proyectos' && (
        <Card className="p-6">
          <p className="text-gray-500 dark:text-gray-400">Las entregas de proyectos estarán disponibles cuando esté implementada la evaluación final por archivos.</p>
        </Card>
      )}
    </div>
  );
};

export default StudentDetail;
