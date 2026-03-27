import { useState } from 'react';
import { X } from 'lucide-react';
import corporateService from '../../services/corporateService';
import { useToast } from '../../context/ToastContext';

export default function BenefitFormModal({ benefit, onClose, onSave }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: benefit?.name || '',
    description: benefit?.description || '',
    icon: benefit?.icon || 'Gift',
    color: benefit?.color || '#e6c364',
    benefit_mode: benefit?.benefit_mode || 'appointment',
    requires_approval: benefit?.requires_approval ?? false,
    max_per_employee: benefit?.max_per_employee ?? 0,
    limit_period: benefit?.limit_period || 'monthly',
    slot_duration_minutes: benefit?.slot_duration_minutes || 60,
    instructions: benefit?.instructions || '',
    is_active: benefit?.is_active ?? true,
    order: benefit?.order || 0,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('El nombre es requerido', 'error'); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        max_per_employee: parseInt(form.max_per_employee) || 0,
        slot_duration_minutes: parseInt(form.slot_duration_minutes) || 60,
        order: parseInt(form.order) || 0,
      };
      if (benefit?.id) {
        await corporateService.adminUpdateBenefit(benefit.id, data);
        showToast('Beneficio actualizado', 'success');
      } else {
        await corporateService.adminCreateBenefit(data);
        showToast('Beneficio creado', 'success');
      }
      onSave();
    } catch (err) {
      const msg = Object.values(err?.response?.data || {}).flat()[0] || 'Error al guardar';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-lg px-3 py-2 text-sm bg-gray-700 border border-gray-600 text-white outline-none focus:border-yellow-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="font-semibold text-yellow-400">
            {benefit?.id ? 'Editar' : 'Nuevo'} Beneficio
          </h3>
          <button onClick={onClose}>
            <X size={20} className="text-gray-400 hover:text-white transition-colors" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className={labelCls}>
              Nombre <span className="text-yellow-400">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputCls}
              placeholder="Ej: Sesión de Medicina Regenerativa"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Descripción del beneficio..."
            />
          </div>

          {/* Ícono y Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ícono (nombre Lucide)</label>
              <input
                name="icon"
                value={form.icon}
                onChange={handleChange}
                className={inputCls}
                placeholder="Gift"
              />
            </div>
            <div>
              <label className={labelCls}>Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className="w-10 h-9 rounded border border-gray-600 bg-gray-700 cursor-pointer"
                />
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="#e6c364"
                />
              </div>
            </div>
          </div>

          {/* Tipo de beneficio y Duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tipo de beneficio</label>
              <select
                name="benefit_mode"
                value={form.benefit_mode}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="appointment">Cita agendada</option>
                <option value="request">Solicitud sin horario</option>
              </select>
            </div>
            {form.benefit_mode === 'appointment' && (
              <div>
                <label className={labelCls}>Duración (minutos)</label>
                <input
                  type="number"
                  name="slot_duration_minutes"
                  value={form.slot_duration_minutes}
                  onChange={handleChange}
                  min={15}
                  step={15}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Límite y período */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Límite por empleado (0=ilimitado)</label>
              <input
                type="number"
                name="max_per_employee"
                value={form.max_per_employee}
                onChange={handleChange}
                min={0}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Período del límite</label>
              <select
                name="limit_period"
                value={form.limit_period}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
                <option value="total">Total</option>
              </select>
            </div>
          </div>

          {/* Instrucciones */}
          <div>
            <label className={labelCls}>Instrucciones para el empleado</label>
            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              rows={2}
              className={inputCls + ' resize-none'}
              placeholder="Instrucciones opcionales..."
            />
          </div>

          {/* Orden y checkboxes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Orden de display</label>
              <input
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                min={0}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="requires_approval"
                  checked={form.requires_approval}
                  onChange={handleChange}
                  className="w-4 h-4 accent-yellow-400"
                />
                <span className="text-sm text-gray-300">Requiere aprobación</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 accent-yellow-400"
                />
                <span className="text-sm text-gray-300">Activo</span>
              </label>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm text-gray-400 border border-gray-600 hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-yellow-400 text-black disabled:opacity-50 hover:bg-yellow-300 transition-colors"
            >
              {saving ? 'Guardando...' : benefit?.id ? 'Actualizar' : 'Crear beneficio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
