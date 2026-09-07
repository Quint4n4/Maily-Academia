import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, Button, Input, Modal, Badge } from '../../components/ui';
import blogService from '../../services/blogService';

const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSlug, setEditingSlug] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', cover_image: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await blogService.list();
      setPosts(res.results || res);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingSlug(null);
    setForm({ title: '', content: '', excerpt: '', cover_image: '', status: 'draft' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingSlug(p.slug);
    setForm({ title: p.title, content: p.content || '', excerpt: p.excerpt || '', cover_image: p.cover_image || '', status: p.status });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.status === 'published' && !editingSlug) {
        payload.published_at = new Date().toISOString();
      }
      if (editingSlug) {
        await blogService.update(editingSlug, payload);
      } else {
        await blogService.create(payload);
      }
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.title?.[0] || 'Error al guardar');
    }
    setSaving(false);
  };

  const handleDelete = async (slug) => {
    if (!window.confirm('¿Eliminar este artículo?')) return;
    try {
      await blogService.remove(slug);
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blog</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{posts.length} artículos</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={18} />}>Nuevo Artículo</Button>
      </div>

      {posts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">No tienes artículos aún.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
                    {p.excerpt && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{p.excerpt}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={p.status === 'published' ? 'primary' : 'secondary'} size="sm">
                        {p.status === 'published' ? 'Publicado' : 'Borrador'}
                      </Badge>
                      {p.published_at && (
                        <span className="text-xs text-gray-400">{new Date(p.published_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)} icon={<Edit size={14} />}>Editar</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(p.slug)} icon={<Trash2 size={14} />}>Eliminar</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSlug ? 'Editar Artículo' : 'Nuevo Artículo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="text-red-500 text-sm">{formError}</p>}
          <Input label="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido</label>
            <textarea
              required
              rows={6}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily transition-all"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
          <Input label="Extracto" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          <Input label="URL Imagen de portada" value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-maily/50 focus:border-maily"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingSlug ? 'Guardar' : 'Publicar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default BlogManagement;
