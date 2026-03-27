import { useState, useEffect } from 'react';
import { X, Tag, Percent, DollarSign, Calendar, Hash, FileText } from 'lucide-react';
import { Modal, Button, Input } from '../../components/ui';
import { courseService } from '../../services/courseService';

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  max_uses: '0',
  valid_from: '',
  valid_until: '',
  applicable_courses: [],
  is_active: true,
};

const toLocalDateTimeValue = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const nowLocalValue = () => toLocalDateTimeValue(new Date().toISOString());

export const CouponFormModal = ({ isOpen, onClose, onSave, coupon }) => {
  const isEdit = Boolean(coupon);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  // Cargar cursos disponibles
  useEffect(() => {
    if (!isOpen) return;
    setCoursesLoading(true);
    courseService.list({ status: 'published', page_size: 200 })
      .then((res) => setCourses(res.results || res || []))
      .catch(() => setCourses([]))
      .finally(() => setCoursesLoading(false));
  }, [isOpen]);

  // Prefill al editar
  useEffect(() => {
    if (isOpen) {
      if (coupon) {
        setForm({
          code: coupon.code || '',
          description: coupon.description || '',
          discount_type: coupon.discount_type || 'percentage',
          discount_value: coupon.discount_value != null ? String(coupon.discount_value) : '',
          max_uses: coupon.max_uses != null ? String(coupon.max_uses) : '0',
          valid_from: toLocalDateTimeValue(coupon.valid_from) || nowLocalValue(),
          valid_until: toLocalDateTimeValue(coupon.valid_until) || '',
          applicable_courses: coupon.applicable_courses || [],
          is_active: coupon.is_active ?? true,
        });
      } else {
        setForm({ ...EMPTY_FORM, valid_from: nowLocalValue() });
      }
      setErrors({});
      setCourseSearch('');
    }
  }, [isOpen, coupon]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = 'El código es obligatorio';
    const val = parseFloat(form.discount_value);
    if (!form.discount_value || isNaN(val) || val <= 0) {
      e.discount_value = 'El valor debe ser mayor a 0';
    } else if (form.discount_type === 'percentage' && val > 100) {
      e.discount_value = 'El porcentaje no puede exceder 100';
    }
    if (form.valid_until && form.valid_from && form.valid_until <= form.valid_from) {
      e.valid_until = 'La fecha de vencimiento debe ser posterior a la de inicio';
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_uses: parseInt(form.max_uses, 10) || 0,
        valid_from: form.valid_from ? new Date(form.valid_from).toISOString() : null,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        applicable_courses: form.applicable_courses,
        is_active: form.is_active,
      };
      await onSave(payload);
      onClose();
    } catch (err) {
      const d = err?.response?.data;
      if (d && typeof d === 'object') {
        const mapped = {};
        Object.entries(d).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setErrors(mapped);
      } else {
        setErrors({ _global: 'Error al guardar el cupón. Intenta de nuevo.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = (courseId) => {
    set(
      'applicable_courses',
      form.applicable_courses.includes(courseId)
        ? form.applicable_courses.filter((id) => id !== courseId)
        : [...form.applicable_courses, courseId]
    );
  };

  const removeCourse = (courseId) => {
    set('applicable_courses', form.applicable_courses.filter((id) => id !== courseId));
  };

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const selectedCourses = courses.filter((c) => form.applicable_courses.includes(c.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar cupón' : 'Crear nuevo cupón'}
      size="lg"
      className="dark:bg-gray-900"
    >
      <div className="space-y-5 dark:text-gray-100">
        {errors._global && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
            {errors._global}
          </div>
        )}

        {/* Código */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Código <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => set('code', e.target.value.toUpperCase())}
            placeholder="Ej: VERANO2026"
            maxLength={50}
            className={`w-full px-3 py-2 rounded-lg border font-mono uppercase text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-maily transition ${
              errors.code
                ? 'border-red-400 dark:border-red-600'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{form.code.length}/50 caracteres</p>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descripción <span className="text-gray-400">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Descripción interna del cupón"
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-maily transition"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{form.description.length}/200 caracteres</p>
        </div>

        {/* Tipo de descuento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de descuento <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discount_type"
                value="percentage"
                checked={form.discount_type === 'percentage'}
                onChange={() => set('discount_type', 'percentage')}
                className="text-maily focus:ring-maily"
              />
              <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                <Percent size={14} /> Porcentaje (%)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="discount_type"
                value="fixed"
                checked={form.discount_type === 'fixed'}
                onChange={() => set('discount_type', 'fixed')}
                className="text-maily focus:ring-maily"
              />
              <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                <DollarSign size={14} /> Monto fijo (MXN)
              </span>
            </label>
          </div>
        </div>

        {/* Valor del descuento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor del descuento <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              {form.discount_type === 'percentage' ? '%' : '$'}
            </span>
            <input
              type="number"
              value={form.discount_value}
              onChange={(e) => set('discount_value', e.target.value)}
              placeholder={form.discount_type === 'percentage' ? '1 - 100' : 'Monto en MXN'}
              min="0"
              max={form.discount_type === 'percentage' ? 100 : undefined}
              step={form.discount_type === 'percentage' ? '1' : '0.01'}
              className={`w-full pl-8 pr-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-maily transition ${
                errors.discount_value
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
          </div>
          {errors.discount_value && <p className="mt-1 text-xs text-red-500">{errors.discount_value}</p>}
        </div>

        {/* Usos máximos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Usos máximos
          </label>
          <input
            type="number"
            value={form.max_uses}
            onChange={(e) => set('max_uses', e.target.value)}
            placeholder="0 = ilimitado"
            min="0"
            step="1"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-maily transition"
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">0 = ilimitado</p>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Válido desde
            </label>
            <input
              type="datetime-local"
              value={form.valid_from}
              onChange={(e) => set('valid_from', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-maily transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Válido hasta <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="datetime-local"
              value={form.valid_until}
              onChange={(e) => set('valid_until', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maily transition ${
                errors.valid_until
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.valid_until && <p className="mt-1 text-xs text-red-500">{errors.valid_until}</p>}
          </div>
        </div>

        {/* Cursos aplicables */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cursos aplicables
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            Deja vacío para aplicar a todos los cursos.
          </p>

          {/* Chips de cursos seleccionados */}
          {selectedCourses.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              {selectedCourses.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-maily/10 text-maily border border-maily/20"
                >
                  {c.title}
                  <button
                    type="button"
                    onClick={() => removeCourse(c.id)}
                    className="ml-0.5 hover:text-red-500 transition-colors"
                    aria-label={`Quitar ${c.title}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Buscador de cursos */}
          <input
            type="text"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-maily transition"
          />

          {coursesLoading ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">Cargando cursos...</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCourses.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 px-3 py-3 text-center">
                  {courseSearch ? 'Sin resultados' : 'No hay cursos publicados'}
                </p>
              ) : (
                filteredCourses.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={form.applicable_courses.includes(c.id)}
                      onChange={() => toggleCourse(c.id)}
                      className="text-maily focus:ring-maily rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{c.title}</span>
                    {c.price != null && (
                      <span className="ml-auto shrink-0 text-xs text-gray-400">
                        ${Number(c.price).toLocaleString('es-MX')}
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Activo toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado del cupón</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {form.is_active ? 'Activo — los alumnos pueden usarlo' : 'Inactivo — no disponible para uso'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-maily focus:ring-offset-2 ${
              form.is_active ? 'bg-maily' : 'bg-gray-300 dark:bg-gray-600'
            }`}
            role="switch"
            aria-checked={form.is_active}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear cupón'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CouponFormModal;
