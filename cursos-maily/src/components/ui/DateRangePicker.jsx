import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const formatDateInput = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().slice(0, 10);
};

const startOfDay = (d) => {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const PRESETS = [
  {
    label: 'Últimos 7 días',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return [formatDateInput(start), formatDateInput(end)];
    },
  },
  {
    label: 'Últimos 30 días',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return [formatDateInput(start), formatDateInput(end)];
    },
  },
  {
    label: 'Este mes',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date();
      return [formatDateInput(start), formatDateInput(end)];
    },
  },
  {
    label: 'Mes anterior',
    getRange: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [formatDateInput(start), formatDateInput(end)];
    },
  },
  {
    label: 'Últimos 3 meses',
    getRange: () => {
      const end = new Date();
      const start = new Date();
      start.setMonth(start.getMonth() - 3);
      return [formatDateInput(start), formatDateInput(end)];
    },
  },
];

const DateRangePicker = ({
  startDate,
  endDate,
  onChange,
  maxDays = 365,
  className = '',
}) => {
  const [error, setError] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const validate = (start, end) => {
    if (!start || !end) return '';
    const s = startOfDay(new Date(start));
    const e = startOfDay(new Date(end));
    if (s > e) return 'La fecha inicio no puede ser mayor que la fecha fin.';
    const diffDays = Math.round((e - s) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) return `El rango no puede superar ${maxDays} días.`;
    return '';
  };

  const handleStartChange = (e) => {
    const newStart = e.target.value;
    const err = validate(newStart, endDate);
    setError(err);
    if (!err) onChange(newStart, endDate);
  };

  const handleEndChange = (e) => {
    const newEnd = e.target.value;
    const err = validate(startDate, newEnd);
    setError(err);
    if (!err) onChange(startDate, newEnd);
  };

  const applyPreset = (preset) => {
    const [start, end] = preset.getRange();
    setError('');
    setShowPresets(false);
    onChange(start, end);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!showPresets) return;
    const handler = () => setShowPresets(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showPresets]);

  const inputBase =
    'px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 ' +
    'bg-white dark:bg-gray-800 text-gray-900 dark:text-white ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ' +
    'transition-colors w-full';

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {/* Icono de calendario */}
      <Calendar size={16} className="text-gray-400 dark:text-gray-500 shrink-0" />

      {/* Input fechas */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500 dark:text-gray-400">Desde</label>
          <input
            type="date"
            value={startDate || ''}
            onChange={handleStartChange}
            max={endDate || undefined}
            className={inputBase}
          />
        </div>
        <span className="text-gray-400 dark:text-gray-500 mt-5">—</span>
        <div className="flex flex-col gap-0.5">
          <label className="text-xs text-gray-500 dark:text-gray-400">Hasta</label>
          <input
            type="date"
            value={endDate || ''}
            onChange={handleEndChange}
            min={startDate || undefined}
            className={inputBase}
          />
        </div>
      </div>

      {/* Presets dropdown */}
      <div className="relative mt-5">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowPresets((v) => !v); }}
          className={
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 ' +
            'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 ' +
            'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          }
        >
          Presets
          <ChevronDown size={14} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
        </button>

        {showPresets && (
          <div
            className={
              'absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-xl ' +
              'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ' +
              'shadow-lg overflow-hidden'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className={
                  'w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 ' +
                  'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                }
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="w-full text-xs text-red-500 dark:text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
};

export default DateRangePicker;
