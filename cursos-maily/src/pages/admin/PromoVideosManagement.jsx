import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Video, Plus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Card, Button, Modal, Input } from '../../components/ui';
import api from '../../services/api';

const SECTION_SLUG = 'maily-academia';

/**
 * Convierte cualquier URL pública de YouTube o Vimeo al formato embed que
 * acepta <iframe>. Devuelve la URL sin cambios si no reconoce el patrón.
 *
 * YouTube soportado:
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/shorts/ID
 *   https://youtube.com/embed/ID  (ya correcto)
 *
 * Vimeo soportado:
 *   https://vimeo.com/ID
 *   https://player.vimeo.com/video/ID  (ya correcto)
 */
function toEmbedUrl(raw = '') {
  const url = raw.trim();
  if (!url) return url;

  // YouTube embed ya correcto
  if (/youtube\.com\/embed\//.test(url)) return url;

  // youtube.com/watch?v=ID  o  youtube.com/watch?v=ID&...
  const watchMatch = url.match(/youtube\.com\/watch[?&]v=([^&\s]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  // youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([^?&\s]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  // youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&\s]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  // Vimeo: vimeo.com/ID
  const vimeoMatch = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // player.vimeo.com ya correcto o URL desconocida → sin cambios
  return url;
}

export default function PromoVideosManagement() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    embed_url: '',
    duration: '',
    order: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadVideos = () => {
    setLoading(true);
    api
      .get(`/admin/sections/${SECTION_SLUG}/promo-videos/`)
      .then((res) => setVideos(Array.isArray(res.data) ? res.data : res.data?.results ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => loadVideos(), []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      embed_url: '',
      duration: '',
      order: videos.length,
      is_active: true,
    });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (video) => {
    setEditing(video);
    setForm({
      title: video.title || '',
      description: video.description || '',
      embed_url: toEmbedUrl(video.embed_url || ''),
      duration: video.duration || '',
      order: video.order ?? 0,
      is_active: video.is_active !== false,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      embed_url: form.embed_url.trim(),
      duration: form.duration.trim() || undefined,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };
    const promise = editing
      ? api.patch(`/admin/sections/${SECTION_SLUG}/promo-videos/${editing.id}/`, payload)
      : api.post(`/admin/sections/${SECTION_SLUG}/promo-videos/`, payload);
    promise
      .then(() => {
        setModalOpen(false);
        loadVideos();
      })
      .catch((err) => {
        const data = err.response?.data;
        setError(
          data?.embed_url?.[0] ||
            data?.title?.[0] ||
            data?.detail ||
            (typeof data === 'string' ? data : 'Error al guardar')
        );
      })
      .finally(() => setSaving(false));
  };

  const handleDelete = (video) => {
    if (!window.confirm(`¿Eliminar el video "${video.title}"?`)) return;
    api
      .delete(`/admin/sections/${SECTION_SLUG}/promo-videos/${video.id}/`)
      .then(() => loadVideos())
      .catch(() => setError('No se pudo eliminar'));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-maily text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Video className="w-7 h-7 text-maily" />
            Videos de prueba Maily Academia
          </h1>
        </div>
        <Button onClick={openCreate} className="inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo video
        </Button>
      </div>

      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
        Estos videos se muestran en la página &quot;Conocer Maily Academia&quot; (Longevity 360) para promocionar la academia.
      </p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <Card className="p-8 text-center text-gray-500 dark:text-gray-400">
          No hay videos. Añade el primero con &quot;Nuevo video&quot;.
        </Card>
      ) : (
        <div className="space-y-4">
          {videos.map((video) => (
            <Card key={video.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{video.title}</h3>
                {video.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{video.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">Orden: {video.order}</span>
                  {!video.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      Inactivo
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="secondary" size="sm" onClick={() => openEdit(video)} className="inline-flex items-center gap-1">
                  <Pencil className="w-4 h-4" />
                  Editar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleDelete(video)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-1">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? 'Editar video' : 'Nuevo video'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Ej: ¿Qué es Maily Academia?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 text-sm"
              placeholder="Breve descripción del video"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL del video (YouTube, Vimeo…)</label>
            <Input
              type="url"
              value={form.embed_url}
              onChange={(e) => setForm((f) => ({ ...f, embed_url: toEmbedUrl(e.target.value) }))}
              required
              placeholder="https://www.youtube.com/watch?v=... o youtu.be/..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pega cualquier URL de YouTube o Vimeo — se convierte automáticamente al formato embed.
            </p>
            {form.embed_url && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400 break-all">
                Embed: {form.embed_url}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (opcional)</label>
            <Input
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              placeholder="Ej: 3 min"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden</label>
            <Input
              type="number"
              min={0}
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-maily focus:ring-maily"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">Activo (visible en la página)</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear video'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
