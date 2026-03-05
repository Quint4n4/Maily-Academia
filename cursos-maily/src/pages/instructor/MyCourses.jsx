import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Edit, Eye, EyeOff, Settings, Clock, Search, Building2, Info } from 'lucide-react';
import { Card, Button, Input, Modal, Badge } from '../../components/ui';
import ImageCropModal from '../../components/ImageCropModal';
import { useAuth } from '../../context/AuthContext';
import courseService from '../../services/courseService';
import { uploadCourseThumbnail } from '../../services/uploadService';

const LEVEL_LABELS = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' };
const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

const MyCourses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', level: 'beginner', duration: '', thumbnail: '', price: 0, requireSequentialProgress: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState('');
  const [cropImageFile, setCropImageFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const load = async () => {
    setLoading(true);
    try {
      const res = await courseService.list({ instructor: user.id });
      setCourses(res.results || res);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user.id]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    switch (sortBy) {
      case 'rating': result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'popular': result = [...result].sort((a, b) => (b.students_count || 0) - (a.students_count || 0)); break;
      default: result = [...result].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return result;
  }, [courses, searchQuery, statusFilter, sortBy]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', level: 'beginner', duration: '', thumbnail: '', price: 0, requireSequentialProgress: false });
    setFormError('');
    setThumbnailUploadError('');
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description,
      level: c.level,
      duration: c.duration || '',
      thumbnail: c.thumbnail || '',
      price: c.price != null ? Number(c.price) : 0,
      requireSequentialProgress: Boolean(c.require_sequential_progress),
    });
    setFormError('');
    setThumbnailUploadError('');
    setShowModal(true);
  };

  const handleThumbnailFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploadError('');
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setThumbnailUploadError('El archivo no puede superar 5 MB.');
      return;
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setThumbnailUploadError('Solo se permiten imágenes (JPEG, PNG, GIF, WebP).');
      return;
    }
    setCropImageFile(file);
    e.target.value = '';
  };

  const handleCropComplete = async (croppedFile) => {
    setCropImageFile(null);
    setUploadingThumbnail(true);
    setThumbnailUploadError('');
    try {
      const url = await uploadCourseThumbnail(croppedFile);
      setForm((prev) => ({ ...prev, thumbnail: url }));
    } catch (err) {
      setThumbnailUploadError(err.response?.data?.detail || 'No se pudo subir la imagen.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const { requireSequentialProgress, ...rest } = form;
      const payload = { ...rest, require_sequential_progress: requireSequentialProgress };
      if (editingId) {
        await courseService.update(editingId, payload);
      } else {
        await courseService.create({ ...payload, status: 'draft' });
      }
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.title?.[0] || 'Error al guardar el curso');
    }
    setSaving(false);
  };

  const handleTogglePublish = async (c) => {
    try {
      const newStatus = c.status === 'published' ? 'draft' : 'published';
      await courseService.update(c.id, { status: newStatus });
      load();
    } catch { /* empty */ }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Cursos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{filteredCourses.length} cursos</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={18} />}>Nuevo Curso</Button>
      </div>

      {/* Banner de academia asignada */}
      {user.instructorSection ? (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-maily/10 dark:bg-maily/20 border border-maily/30 text-maily dark:text-maily-300">
          <Building2 size={18} className="shrink-0" />
          <p className="text-sm font-medium">
            Tus cursos se publican en <span className="font-bold">{user.instructorSection.name}</span>. Al crear un nuevo curso se asignará automáticamente a esta academia.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400">
          <Info size={18} className="shrink-0" />
          <p className="text-sm font-medium">
            No tienes una academia asignada. Contacta al administrador para que te asigne a una academia antes de crear cursos.
          </p>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar cursos..." icon={<Search size={18} />} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['', 'published', 'draft'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-maily text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
              >
                {s === 'published' ? 'Publicados' : s === 'draft' ? 'Borradores' : 'Todos'}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200"
            >
              <option value="newest">Más recientes</option>
              <option value="rating">Mejor valorados</option>
              <option value="popular">Más estudiantes</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card padding={false} className="overflow-hidden h-full flex flex-col">
                <div className="relative aspect-video">
                  <img
                    src={c.thumbnail || 'https://placehold.co/400x192?text=Curso'}
                    alt={c.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    <Badge variant={c.level === 'beginner' ? 'success' : c.level === 'intermediate' ? 'warning' : 'danger'} size="sm">
                      {LEVEL_LABELS[c.level] || c.level}
                    </Badge>
                    <Badge variant={c.status === 'published' ? 'primary' : 'secondary'} size="sm">
                      {c.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  {c.section_slug && (
                    <div className="absolute bottom-2 right-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white backdrop-blur-sm">
                        <Building2 size={11} />
                        {c.section_name || c.section_slug}
                      </span>
                    </div>
                  )}
                </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{c.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tú</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{c.duration || '-'}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" />{c.total_lessons ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${(!c.price || Number(c.price) === 0) ? 'text-green-600 dark:text-green-400' : 'text-maily'}`}>
                      {(!c.price || Number(c.price) === 0) ? 'Gratis' : `$${Number(c.price).toFixed(2)}`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{c.students_count ?? 0} estudiantes</p>
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <Button size="sm" variant="primary" onClick={() => navigate(`/instructor/courses/${c.id}/edit`)} icon={<Settings size={14} />}>Contenido</Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/instructor/courses/${c.id}/analytics`)}>Analytics</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)} icon={<Edit size={14} />}>Editar</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleTogglePublish(c)} icon={c.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}>
                    {c.status === 'published' ? 'Despublicar' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
      {filteredCourses.length === 0 && (
        <Card className="p-12 text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No tienes cursos aún. Crea tu primer curso.</p>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Editar Curso' : 'Nuevo Curso'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily transition-all"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel</label>
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Input label="Duración" placeholder="Ej: 4 horas" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
          </div>
          <Input
            label="Precio (0 = gratis)"
            type="number"
            placeholder="0"
            min={0}
            step={0.01}
            value={form.price ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setForm({ ...form, price: v === '' ? 0 : Math.max(0, parseFloat(v) || 0) });
            }}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagen del curso</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleThumbnailFile}
              disabled={uploadingThumbnail}
              className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-maily file:text-white hover:file:bg-maily/90"
            />
            {uploadingThumbnail && <p className="text-sm text-maily mt-1">Subiendo...</p>}
            {thumbnailUploadError && <p className="text-sm text-red-500 mt-1">{thumbnailUploadError}</p>}
            {form.thumbnail && (
              <div className="mt-2 flex items-center gap-2">
                <img src={form.thumbnail} alt="Vista previa" className="w-full aspect-video object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, thumbnail: '' }))}
                  className="text-sm text-gray-500 hover:text-red-500"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="requireSequential"
              checked={form.requireSequentialProgress}
              onChange={(e) => setForm({ ...form, requireSequentialProgress: e.target.checked })}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-maily focus:ring-maily"
            />
            <div>
              <label htmlFor="requireSequential" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Requerir completar lecciones en orden
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Si está activo, los alumnos deben marcar cada lección como completada para desbloquear la siguiente.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingId ? 'Guardar' : 'Crear Curso'}</Button>
          </div>
        </form>
      </Modal>
      <ImageCropModal
        isOpen={!!cropImageFile}
        imageFile={cropImageFile}
        onComplete={handleCropComplete}
        onCancel={() => setCropImageFile(null)}
      />
    </div>
  );
};

export default MyCourses;
