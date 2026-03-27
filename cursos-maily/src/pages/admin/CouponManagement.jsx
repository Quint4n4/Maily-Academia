import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Search, MoreVertical, Edit, Trash2,
  ToggleLeft, ToggleRight, Ticket, TrendingDown, Activity,
} from 'lucide-react';
import { Card, Button, Badge, Pagination } from '../../components/ui';
import { SkeletonTableRow, SkeletonStatCard } from '../../components/ui/SkeletonLoader';
import { Modal } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import {
  getCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus,
} from '../../services/adminService';
import CouponFormModal from './CouponFormModal';

const PAGE_SIZE = 20;

// ─── Formateadores ─────────────────────────────────────────────────────────────
const formatDate = (iso) => {
  if (!iso) return 'Sin expiración';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDiscount = (coupon) => {
  if (coupon.discount_type === 'percentage') return `${coupon.discount_value}%`;
  return `$${Number(coupon.discount_value).toLocaleString('es-MX')} MXN`;
};

const formatUses = (coupon) => {
  const max = coupon.max_uses;
  const used = coupon.times_used ?? 0;
  return `${used} / ${max === 0 ? '∞' : max}`;
};

// ─── Menú de acciones ──────────────────────────────────────────────────────────
const ActionsMenu = ({ coupon, onEdit, onToggle, onDelete }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Opciones"
      >
        <MoreVertical size={16} className="text-gray-500 dark:text-gray-400" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 overflow-hidden"
          >
            <button
              onClick={() => { setOpen(false); onEdit(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
            >
              <Edit size={14} /> Editar
            </button>
            <button
              onClick={() => { setOpen(false); onToggle(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
            >
              {coupon.is_active
                ? <><ToggleLeft size={14} /> Desactivar</>
                : <><ToggleRight size={14} /> Activar</>
              }
            </button>
            <hr className="my-1 border-gray-100 dark:border-gray-700" />
            <button
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} /> Eliminar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card className="p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </Card>
  </motion.div>
);

// ─── Componente principal ──────────────────────────────────────────────────────
const CouponManagement = () => {
  const toast = useToast();

  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modales
  const [formModal, setFormModal] = useState({ open: false, coupon: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, coupon: null });
  const [deleting, setDeleting] = useState(false);

  // Stats locales (calculadas desde la lista completa si no hay endpoint)
  const [stats, setStats] = useState({ active: 0, usedToday: 0, totalSavings: 0 });

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.is_active = statusFilter === 'active' ? 'true' : 'false';
      if (typeFilter) params.discount_type = typeFilter;
      const res = await getCoupons(params);
      const data = res.data;
      const list = data.results || data || [];
      setCoupons(list);
      setTotalCount(data.count ?? list.length);
    } catch (err) {
      toast.error('No se pudo cargar la lista de cupones.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stats: cargamos sin filtros para calcular métricas globales
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getCoupons({ page_size: 1000 });
      const list = res.data?.results || res.data || [];
      const active = list.filter((c) => c.is_active).length;
      const today = new Date().toDateString();
      const usedToday = list.filter((c) => {
        const last = c.last_used_at ? new Date(c.last_used_at).toDateString() : null;
        return last === today;
      }).length;
      const totalSavings = list.reduce((acc, c) => {
        const used = c.times_used ?? 0;
        const val = parseFloat(c.discount_value) || 0;
        if (c.discount_type === 'fixed') return acc + used * val;
        return acc; // porcentajes: difícil sumar sin saber precio original
      }, 0);
      setStats({ active, usedToday, totalSavings });
    } catch {
      // silencioso
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);
  useEffect(() => { load(page); }, [search, statusFilter, typeFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadStats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (payload) => {
    if (formModal.coupon) {
      await updateCoupon(formModal.coupon.id, payload);
      toast.success('Cupón actualizado correctamente.');
    } else {
      await createCoupon(payload);
      toast.success('Cupón creado correctamente.');
    }
    load(page);
    loadStats();
  };

  const handleToggle = async (coupon) => {
    try {
      await toggleCouponStatus(coupon.id, !coupon.is_active);
      toast.success(`Cupón ${!coupon.is_active ? 'activado' : 'desactivado'}.`);
      load(page);
      loadStats();
    } catch {
      toast.error('No se pudo cambiar el estado del cupón.');
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.coupon) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteModal.coupon.id);
      toast.success('Cupón eliminado.');
      setDeleteModal({ open: false, coupon: null });
      load(page);
      loadStats();
    } catch {
      toast.error('No se pudo eliminar el cupón.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ticket size={28} className="text-maily" />
            Gestión de Cupones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{totalCount} cupones en la plataforma</p>
        </div>
        <Button
          onClick={() => setFormModal({ open: true, coupon: null })}
          icon={<Plus size={16} />}
        >
          Crear cupón
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard
              delay={0}
              icon={<Tag size={20} />}
              label="Cupones activos"
              value={stats.active}
              color="text-green-600 bg-green-100 dark:bg-green-900/30"
            />
            <StatCard
              delay={0.05}
              icon={<Activity size={20} />}
              label="Usados hoy"
              value={stats.usedToday}
              color="text-blue-600 bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              delay={0.1}
              icon={<TrendingDown size={20} />}
              label="Ahorro total generado (fijos)"
              value={`$${stats.totalSavings.toLocaleString('es-MX', { minimumFractionDigits: 0 })} MXN`}
              color="text-purple-600 bg-purple-100 dark:bg-purple-900/30"
            />
          </>
        )}
      </div>

      {/* Filtros */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-maily transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maily transition"
          >
            <option value="">Estado: Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-maily transition"
          >
            <option value="">Tipo: Todos</option>
            <option value="percentage">Porcentaje</option>
            <option value="fixed">Monto fijo</option>
          </select>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Código</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Descuento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden md:table-cell">Usos</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden lg:table-cell">Válido hasta</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} cols={7} />
                ))
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400 dark:text-gray-500">
                    <Ticket size={36} className="mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Sin cupones</p>
                    <p className="text-xs mt-1">
                      {search || statusFilter || typeFilter
                        ? 'No hay resultados para estos filtros.'
                        : 'Crea tu primer cupón con el botón de arriba.'}
                    </p>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon, i) => (
                  <motion.tr
                    key={coupon.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    {/* Código */}
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 tracking-wider">
                        {coupon.code}
                      </span>
                      {coupon.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 max-w-[14rem] truncate">
                          {coupon.description}
                        </p>
                      )}
                    </td>

                    {/* Tipo */}
                    <td className="px-5 py-3.5 hidden sm:table-cell text-gray-600 dark:text-gray-300">
                      {coupon.discount_type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                    </td>

                    {/* Descuento */}
                    <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">
                      {formatDiscount(coupon)}
                    </td>

                    {/* Usos */}
                    <td className="px-5 py-3.5 hidden md:table-cell text-gray-600 dark:text-gray-300">
                      {formatUses(coupon)}
                    </td>

                    {/* Fecha */}
                    <td className="px-5 py-3.5 hidden lg:table-cell text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(coupon.valid_until)}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={coupon.is_active ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {coupon.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3.5">
                      <ActionsMenu
                        coupon={coupon}
                        onEdit={() => setFormModal({ open: true, coupon })}
                        onToggle={() => handleToggle(coupon)}
                        onDelete={() => setDeleteModal({ open: true, coupon })}
                      />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Página {page} de {totalPages} &middot; {totalCount} cupones
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* Modal crear/editar */}
      <CouponFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, coupon: null })}
        onSave={handleSave}
        coupon={formModal.coupon}
      />

      {/* Modal confirmar eliminación */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, coupon: null })}
        title="Eliminar cupón"
        size="sm"
        className="dark:bg-gray-900"
      >
        <div className="space-y-4 dark:text-gray-100">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <Trash2 size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                ¿Eliminar el cupón{' '}
                <span className="font-mono font-bold">{deleteModal.coupon?.code}</span>?
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                Esta acción no se puede deshacer. Si ya fue usado, los descuentos existentes no se verán afectados.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteModal({ open: false, coupon: null })}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              icon={<Trash2 size={14} />}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CouponManagement;
