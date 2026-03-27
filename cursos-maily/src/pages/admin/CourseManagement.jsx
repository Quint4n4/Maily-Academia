import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Trash2, Eye, Archive, RotateCcw, Edit, X } from 'lucide-react';
import { Card, Button, Input, Badge, Pagination, Modal } from '../../components/ui';
import { SkeletonTableRow } from '../../components/ui/SkeletonLoader';
import courseService from '../../services/courseService';
import userService from '../../services/userService';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
const STATUS_LABELS = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' };
const STATUS_COLORS = { draft: 'secondary', published: 'primary', archived: 'accent' };

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [instructors, setInstructors] = useState([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Edit modal state
  const [editModal, setEditModal] = useState({ open: false, course: null });
  const [editForm, setEditForm] = useState({ title: '', description: '', price: '', status: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    userService.list({ role: 'instructor' }).then((res) => {
      setInstructors(res.results || res || []);
    }).catch(() => {});
  }, []);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (instructorFilter) params.instructor = instructorFilter;
      const res = await courseService.list(params);
      setCourses(res.results || res);
      setTotalCount(res.count ?? (res.results || res).length);
    } catch (err) {
      console.error('Error loading courses:', err);
    }
    setLoading(false);
  };

  useEffect(() => { setPage(1); }, [statusFilter, search, instructorFilter]);
  useEffect(() => { load(page); }, [statusFilter, search, instructorFilter, page]);

  const handleStatusChange = async (id, newStatus) => {
    setActionError('');
    try {
      await courseService.update(id, { status: newStatus });
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.status?.[0] || 'No se pudo cambiar el estado del curso.';
      setActionError(msg);
    }
  };

  const openEdit = (course) => {
    setEditForm({
      title: course.title || '',
      description: course.description || '',
      price: course.price ?? '',
      status: course.status || '',
    });
    setEditError('');
    setEditModal({ open: true, course });
  };

  const handleEditSave = async () => {
    setEditSaving(true);
    setEditError('');
    try {
      await courseService.update(editModal.course.id, {
        title: editForm.title,
        description: editForm.description,
        price: editForm.price === '' ? 0 : Number(editForm.price),
        status: editForm.status,
      });
      setEditModal({ open: false, course: null });
      load();
    } catch (err) {
      const d = err.response?.data;
      setEditError(d?.detail || d?.title?.[0] || d?.price?.[0] || 'Error al guardar los cambios.');
    }
    setEditSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso?')) return;
    setActionError('');
    try {
      await courseService.remove(id);
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo eliminar el curso.';
      setActionError(msg);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Cursos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{totalCount} cursos en la plataforma</p>
      </div>

      {actionError && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </div>
      )}

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
          <select
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            value={instructorFilter}
            onChange={(e) => setInstructorFilter(e.target.value)}
          >
            <option value="">Todos los profesores</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>{i.first_name} {i.last_name} ({i.email})</option>
            ))}
          </select>
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
        <Card className="p-4 divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonTableRow key={i} cols={4} />
          ))}
        </Card>
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
                    <Button size="sm" variant="secondary" onClick={() => openEdit(course)} icon={<Edit size={14} />}>
                      Editar
                    </Button>
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
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(course.id, 'published')} icon={<RotateCcw size={14} />}>
                        Restaurar
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
          <Pagination
            page={page}
            totalPages={Math.ceil(totalCount / PAGE_SIZE)}
            count={totalCount}
            onPageChange={setPage}
          />
        </div>
      )}
      {/* Edit Course Modal */}
      <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, course: null })} title="Editar curso">
        <div className="space-y-4">
          {editError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{editError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (MXN)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal({ open: false, course: null })} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleEditSave} loading={editSaving} className="flex-1">
              Guardar cambios
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CourseManagement;
