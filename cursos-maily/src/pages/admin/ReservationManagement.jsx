import { useState, useEffect } from 'react';
import {
  Search, CheckCircle, XCircle, UserCheck, Package,
  Calendar, Clock, ChevronDown, Filter, ChevronLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import corporateService from '../../services/corporateService';
import { useToast } from '../../context/ToastContext';

const STATUS_CFG = {
  pending:   { label: 'Pendiente',      cls: 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-400/15', dot: 'bg-yellow-400' },
  confirmed: { label: 'Confirmada',     cls: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-400/15',         dot: 'bg-blue-500'   },
  cancelled: { label: 'Cancelada',      cls: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-400/15',             dot: 'bg-red-500'    },
  completed: { label: 'Completada',     cls: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-400/15',     dot: 'bg-green-500'  },
  no_show:   { label: 'No se presentó', cls: 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-400/15', dot: 'bg-orange-400' },
};

/** Iniciales de un nombre para el avatar */
function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

/** Formatea "2026-04-14" → "14 Abr 2026" */
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

// ── Card individual ──────────────────────────────────────────────────────────

function ReservationCard({ r, onAction }) {
  const st = STATUS_CFG[r.status] || STATUS_CFG.pending;
  const canAct = r.status === 'pending' || r.status === 'confirmed';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Banda de color del beneficio */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: r.benefit_type_color || '#6366f1' }}
      />

      <div className="p-4">
        {/* Encabezado: empleado + estado */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar con iniciales */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
              style={{ backgroundColor: r.benefit_type_color || '#6366f1' }}
            >
              {initials(r.user_name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                {r.user_name}
              </p>
              {/* Beneficio con punto de color */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: r.benefit_type_color || '#6366f1' }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{r.benefit_type_name}</span>
              </div>
            </div>
          </div>

          {/* Badge de estado */}
          <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 flex items-center gap-1 ${st.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {st.label}
          </span>
        </div>

        {/* Fecha y hora */}
        <div className="flex items-center gap-4 py-3 border-t border-b border-gray-100 dark:border-gray-700 mb-3">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium">{fmtDate(r.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <Clock size={14} className="text-gray-400 dark:text-gray-500" />
            <span className="text-sm">{r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}</span>
          </div>
        </div>

        {/* Notas del empleado (si hay) */}
        {r.notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-3 line-clamp-2">
            "{r.notes}"
          </p>
        )}

        {/* Acciones */}
        {canAct ? (
          <div className="flex gap-2 flex-wrap">
            {r.status === 'pending' && (
              <button
                onClick={() => onAction(r.id, 'confirmed')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-400/10 dark:hover:bg-green-400/20 text-green-700 dark:text-green-400 transition-colors"
              >
                <CheckCircle size={13} /> Confirmar
              </button>
            )}
            <button
              onClick={() => onAction(r.id, 'completed')}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-400/10 dark:hover:bg-blue-400/20 text-blue-700 dark:text-blue-400 transition-colors"
            >
              <UserCheck size={13} /> Completada
            </button>
            <button
              onClick={() => onAction(r.id, 'no_show')}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-medium rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-400/10 dark:hover:bg-orange-400/20 text-orange-700 dark:text-orange-400 transition-colors"
              title="No se presentó"
            >
              <Package size={13} />
            </button>
            <button
              onClick={() => onAction(r.id, 'cancelled')}
              className="flex items-center justify-center gap-1 py-1.5 px-2.5 text-xs font-medium rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-400/10 dark:hover:bg-red-400/20 text-red-700 dark:text-red-400 transition-colors"
              title="Cancelar"
            >
              <XCircle size={13} />
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
            Sin acciones disponibles
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function ReservationManagement() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [reservations,   setReservations]   = useState([]);
  const [benefits,       setBenefits]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterBenefit,  setFilterBenefit]  = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo,   setFilterDateTo]   = useState('');
  const [showFilters,    setShowFilters]    = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, ben] = await Promise.all([
        corporateService.adminGetReservations({
          status:       filterStatus,
          benefit_type: filterBenefit,
          date_from:    filterDateFrom,
          date_to:      filterDateTo,
          search,
        }),
        corporateService.adminGetBenefits(),
      ]);
      setReservations(Array.isArray(res) ? res : res.results || []);
      setBenefits(Array.isArray(ben)     ? ben : ben.results || []);
    } catch {
      showToast('Error al cargar reservaciones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, filterBenefit, filterDateFrom, filterDateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleAction = async (id, status) => {
    try {
      await corporateService.adminUpdateReservation(id, { status });
      showToast(`Cita actualizada: ${STATUS_CFG[status]?.label || status}`, 'success');
      loadData();
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const inputCls = "rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 w-full";

  // Contadores por estado para los tabs rápidos
  const counts = {
    all:       reservations.length,
    pending:   reservations.filter(r => r.status === 'pending').length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="p-6 min-h-screen">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/corporate/benefits')}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reservaciones</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Citas agendadas del portal corporativo</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
        >
          <Filter size={15} /> Filtros
          <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Tabs rápidos por estado */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: '',          label: `Todas (${counts.all})` },
          { key: 'pending',   label: `Pendientes (${counts.pending})` },
          { key: 'confirmed', label: `Confirmadas (${counts.confirmed})` },
          { key: 'completed', label: `Completadas (${counts.completed})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Panel de filtros avanzados */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empleado..."
                className={inputCls + ' pl-8'}
              />
            </div>
            <select
              value={filterBenefit}
              onChange={(e) => setFilterBenefit(e.target.value)}
              className={inputCls}
            >
              <option value="">Todos los beneficios</option>
              {benefits.filter(b => b.benefit_mode === 'appointment').map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className={inputCls}
              title="Desde"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className={inputCls}
              title="Hasta"
            />
          </form>
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl h-52 animate-pulse" />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calendar size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay citas para mostrar</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Prueba ajustando los filtros
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
            {reservations.length} cita{reservations.length !== 1 ? 's' : ''} encontrada{reservations.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {reservations.map(r => (
              <ReservationCard key={r.id} r={r} onAction={handleAction} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
