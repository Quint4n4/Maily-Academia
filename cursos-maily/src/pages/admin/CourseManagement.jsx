import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Trash2, Eye, EyeOff, Archive } from 'lucide-react';
import { Card, Button, Input, Badge } from '../../components/ui';
import courseService from '../../services/courseService';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
const STATUS_LABELS = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };
const STATUS_COLORS = { draft: 'secondary', published: 'primary', archived: 'accent' };

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const res = await courseService.list(params);
      setCourses(res.results || res);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, search]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await courseService.update(id, { status: newStatus });
      load();
    } catch { /* empty */ }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso?')) return;
    try {
      await courseService.remove(id);
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo eliminar el curso.';
      window.alert(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Cursos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{courses.length} cursos en la plataforma</p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar cursos..."
              icon={<Search size={18} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['', 'draft', 'published', 'archived'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-maily text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {s ? STATUS_LABELS[s] : 'Todos'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course, i) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {course.thumbnail && (
                      <img src={course.thumbnail} alt="" className="w-16 h-16 rounded-lg object-cover hidden sm:block" />
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Por {course.instructor_name} &middot; {LEVEL_LABELS[course.level] || course.level} &middot; {course.total_lessons} lecciones
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={STATUS_COLORS[course.status]} size="sm">{STATUS_LABELS[course.status]}</Badge>
                        <span className="text-xs text-gray-400">{course.students_count} estudiantes</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {course.status === 'draft' && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(course.id, 'published')} icon={<Eye size={14} />}>
                        Publicar
                      </Button>
                    )}
                    {course.status === 'published' && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(course.id, 'archived')} icon={<Archive size={14} />}>
                        Archivar
                      </Button>
                    )}
                    {course.status === 'archived' && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(course.id, 'published')} icon={<Eye size={14} />}>
                        Republicar
                      </Button>
                    )}
                    {(course.students_count ?? 0) === 0 ? (
                      <Button size="sm" variant="danger" onClick={() => handleDelete(course.id)} icon={<Trash2 size={14} />}>
                        Eliminar
                      </Button>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600"
                        title="No se puede eliminar: tiene alumnos inscritos. Usa Archivar."
                      >
                        <Trash2 size={14} /> Eliminar
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
          {courses.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">No se encontraron cursos.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
