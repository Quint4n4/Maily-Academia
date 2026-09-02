import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, X, Check, Loader2 } from 'lucide-react';
import * as corporateService from '../../services/corporateService';
import { useToast } from '../../context/ToastContext';

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DIAS_HEADER = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DIAS_NOMBRE = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7;
  return `${DIAS_NOMBRE[dow]} ${d} de ${MESES[m - 1]}`;
}

function jsDayToWeekday(jsDay) {
  return (jsDay + 6) % 7;
}

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startDow = jsDayToWeekday(firstDay.getDay());
  const cells    = [];

  for (let i = startDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month, -i), current: false });

  for (let d = 1; d <= lastDay.getDate(); d++)
    cells.push({ date: new Date(year, month, d), current: true });

  const tail = 7 - (cells.length % 7);
  if (tail < 7)
    for (let d = 1; d <= tail; d++)
      cells.push({ date: new Date(year, month + 1, d), current: false });

  return cells;
}

// ── Estilos por estado del día (tema claro) ──────────────────────────────────

const DAY_STYLES = {
  other:     { bg: '#f9fafb', numColor: '#d1d5db', border: 'transparent' },
  empty:     { bg: '#ffffff', numColor: '#374151', border: '#e5e7eb' },
  scheduled: { bg: '#fefce8', numColor: '#374151', border: '#fde047' },
  available: { bg: '#f0fdf4', numColor: '#16a34a', border: '#86efac' },
  blocked:   { bg: '#fef2f2', numColor: '#dc2626', border: '#fca5a5' },
};

// ── Componente principal ──────────────────────────────────────────────────────

const FORM_DEFAULT = { enabled: true, start_time: '09:00', end_time: '13:00', concurrent: 1, reason: '' };

export default function ScheduleManagement() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const { showToast } = useToast();

  const benefitId   = state?.benefitId;
  const benefitName = state?.benefitName || 'Beneficio';

  const today    = new Date();
  const todayStr = toDateStr(today);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [schedules,   setSchedules]   = useState([]);
  const [exceptions,  setExceptions]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selectedStr, setSelectedStr] = useState(null);
  const [form, setForm] = useState(FORM_DEFAULT);

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!benefitId) return;
    setLoading(true);
    try {
      const [sch, exc] = await Promise.all([
        corporateService.adminGetSchedules(benefitId),
        corporateService.adminGetExceptions({ benefit_id: benefitId }),
      ]);
      setSchedules(Array.isArray(sch)  ? sch  : sch?.results  || []);
      setExceptions(Array.isArray(exc) ? exc  : exc?.results  || []);
    } catch {
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [benefitId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // ── Estado visual de cada día ───────────────────────────────────────────────

  function dayStatus(dateStr) {
    const exc = exceptions.find(e => e.date === dateStr);
    if (exc) return exc.is_blocked ? 'blocked' : 'available';

    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = jsDayToWeekday(new Date(y, m - 1, d).getDay());
    if (schedules.some(s => s.day_of_week === dow && s.is_active !== false))
      return 'scheduled';

    return 'empty';
  }

  function dayStartTime(dateStr) {
    const exc = exceptions.find(e => e.date === dateStr);
    if (exc && !exc.is_blocked) return exc.start_time?.slice(0, 5) || '';

    if (!exc) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dow = jsDayToWeekday(new Date(y, m - 1, d).getDay());
      const sch = schedules.find(s => s.day_of_week === dow && s.is_active !== false);
      if (sch) return sch.start_time?.slice(0, 5) || '';
    }
    return '';
  }

  // ── Selección de día ────────────────────────────────────────────────────────

  function selectDay(date, current) {
    if (!current) return;
    const ds = toDateStr(date);
    setSelectedStr(ds);

    const exc = exceptions.find(e => e.date === ds);
    if (exc) {
      setForm({
        enabled:    !exc.is_blocked,
        start_time: exc.start_time?.slice(0, 5) || '09:00',
        end_time:   exc.end_time?.slice(0, 5)   || '13:00',
        concurrent: 1,
        reason:     exc.reason || '',
      });
      return;
    }

    const [y, m, d] = ds.split('-').map(Number);
    const dow = jsDayToWeekday(new Date(y, m - 1, d).getDay());
    const sch = schedules.find(s => s.day_of_week === dow);
    setForm({
      enabled:    true,
      start_time: sch?.start_time?.slice(0, 5) || '09:00',
      end_time:   sch?.end_time?.slice(0, 5)   || '13:00',
      concurrent: 1,
      reason:     '',
    });
  }

  function selectFromChip(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    setSelectedStr(dateStr);
    selectDay(new Date(y, m - 1, d), true);
  }

  // ── Guardar / Limpiar ───────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedStr) return;
    setSaving(true);
    try {
      const existing = exceptions.find(e => e.date === selectedStr);
      if (existing) await corporateService.adminDeleteException(existing.id);

      const payload = {
        benefit_type: benefitId,
        date:         selectedStr,
        is_blocked:   !form.enabled,
        reason:       form.reason || '',
        start_time:   form.enabled ? form.start_time : null,
        end_time:     form.enabled ? form.end_time   : null,
      };
      await corporateService.adminCreateException(payload);
      showToast('Día guardado correctamente', 'success');
      loadData();
    } catch (err) {
      const msg = Object.values(err?.response?.data || {}).flat()[0] || 'Error al guardar';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    const existing = exceptions.find(e => e.date === selectedStr);
    if (!existing) { setForm(FORM_DEFAULT); return; }
    setSaving(true);
    try {
      await corporateService.adminDeleteException(existing.id);
      showToast('Configuración eliminada', 'success');
      setForm(FORM_DEFAULT);
      loadData();
    } catch {
      showToast('Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function removeChip(id, dateStr, e) {
    e.stopPropagation();
    try {
      await corporateService.adminDeleteException(id);
      showToast('Configuración eliminada', 'success');
      if (dateStr === selectedStr) { setSelectedStr(null); setForm(FORM_DEFAULT); }
      loadData();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  }

  // ── Navegación de mes ───────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // ── Renderizado ─────────────────────────────────────────────────────────────

  const cells   = buildCalendar(viewYear, viewMonth);
  const recents = [...exceptions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  if (!benefitId) {
    return (
      <div className="p-6 min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">Selecciona un beneficio desde la gestión de beneficios.</p>
        <button
          onClick={() => navigate('/admin/corporate/benefits')}
          className="mt-4 flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ChevronLeft size={16} /> Volver a Beneficios
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin/corporate/benefits')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurar disponibilidad</h1>
          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{benefitName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* ── Calendario ── */}
        <section className="lg:col-span-6">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">

            {/* Navegación mes */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {MESES[viewMonth]} {viewYear}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Haz clic en un día para configurar su disponibilidad
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Encabezados días */}
                  {DIAS_HEADER.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 pb-2 uppercase tracking-wider">
                      {d}
                    </div>
                  ))}

                  {/* Celdas */}
                  {cells.map(({ date, current }, i) => {
                    const ds        = toDateStr(date);
                    const status    = current ? dayStatus(ds) : 'other';
                    const startT    = current ? dayStartTime(ds) : '';
                    const isSelected = ds === selectedStr;
                    const isToday    = ds === todayStr;
                    const s         = DAY_STYLES[status] || DAY_STYLES.empty;

                    const borderColor = isSelected ? '#2563eb' : isToday ? '#93c5fd' : s.border;
                    const boxShadow   = isSelected ? '0 0 0 2px #bfdbfe' : 'none';

                    return (
                      <div
                        key={i}
                        onClick={() => current && selectDay(date, current)}
                        className="aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all duration-150"
                        style={{
                          backgroundColor: s.bg,
                          border:          `1.5px solid ${borderColor}`,
                          boxShadow,
                          cursor: current ? 'pointer' : 'default',
                        }}
                      >
                        <span className="text-sm font-semibold" style={{ color: s.numColor }}>
                          {date.getDate()}
                        </span>

                        {isToday && current && (
                          <span className="text-blue-500 font-bold" style={{ fontSize: '7px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Hoy
                          </span>
                        )}

                        {status === 'blocked' && (
                          <X size={10} className="absolute top-1 right-1 text-red-400" />
                        )}

                        {startT && status !== 'blocked' && (
                          <div
                            className="absolute bottom-1 flex items-center gap-0.5 px-1 py-0.5 rounded font-bold"
                            style={{
                              fontSize: '8px',
                              backgroundColor: status === 'available' ? '#dcfce7' : '#fef9c3',
                              color:           status === 'available' ? '#16a34a' : '#92400e',
                            }}
                          >
                            <Clock size={7} />
                            {startT}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Leyenda */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 justify-center">
                  {[
                    { color: '#16a34a', bg: '#f0fdf4', label: 'Disponible' },
                    { color: '#92400e', bg: '#fefce8', label: 'Horario semanal' },
                    { color: '#dc2626', bg: '#fef2f2', label: 'Bloqueado' },
                    { color: '#6b7280', bg: '#ffffff', label: 'Sin configurar' },
                  ].map(({ color, bg, label }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: bg }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Panel de configuración ── */}
        <section className="lg:col-span-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 sticky top-24">

            {!selectedStr ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Calendar size={40} className="mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-semibold text-gray-700 dark:text-white">Selecciona un día</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Haz clic en cualquier día del calendario para configurar su disponibilidad
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                    Configuración de día
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatDisplay(selectedStr)}
                  </h3>
                </div>

                <div className="space-y-4">

                  {/* Toggle disponible / bloqueado */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">Estado del día</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Habilitar atención para esta fecha</p>
                    </div>
                    <div
                      onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                      className="relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200"
                      style={{ backgroundColor: form.enabled ? '#2563eb' : '#d1d5db' }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
                        style={{ left: form.enabled ? '22px' : '2px' }}
                      />
                    </div>
                  </div>

                  {/* Horas */}
                  {form.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Hora Inicio', key: 'start_time' },
                        { label: 'Hora Fin',    key: 'end_time' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                            {label}
                          </label>
                          <div className="relative">
                            <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                            <input
                              type="time"
                              value={form[key]}
                              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Citas simultáneas */}
                  {form.enabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Citas simultáneas
                      </label>
                      <div className="relative">
                        <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={form.concurrent || 1}
                          onChange={e => setForm(f => ({ ...f, concurrent: parseInt(e.target.value) || 1 }))}
                          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 outline-none focus:border-blue-500 dark:focus:border-blue-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Motivo bloqueo */}
                  {!form.enabled && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Motivo del bloqueo
                      </label>
                      <textarea
                        value={form.reason}
                        onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                        placeholder="Opcional..."
                        rows={3}
                        className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 outline-none resize-none focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                  )}

                  {/* Botones */}
                  <div className="pt-1 space-y-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-2.5 rounded-lg font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                      Guardar día
                    </button>
                    <button
                      onClick={handleClear}
                      disabled={saving}
                      className="w-full py-2.5 rounded-lg font-semibold text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* ── Días configurados recientemente ── */}
      {recents.length > 0 && (
        <section className="mt-6">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Días configurados recientemente
          </h4>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recents.map(ex => (
              <div
                key={ex.id}
                onClick={() => selectFromChip(ex.date)}
                className={`flex-none rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-colors border ${
                  selectedStr === ex.date
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                style={{ minWidth: '200px' }}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  ex.is_blocked ? 'bg-red-100 dark:bg-red-400/10' : 'bg-green-100 dark:bg-green-400/10'
                }`}>
                  {ex.is_blocked
                    ? <X size={15} className="text-red-600 dark:text-red-400" />
                    : <Check size={15} className="text-green-600 dark:text-green-400" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{formatDisplay(ex.date)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                    {ex.is_blocked
                      ? `Bloqueado${ex.reason ? ': ' + ex.reason : ''}`
                      : `${ex.start_time?.slice(0, 5)} – ${ex.end_time?.slice(0, 5)}`
                    }
                  </p>
                </div>

                <button
                  onClick={e => removeChip(ex.id, ex.date, e)}
                  className="p-1 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
