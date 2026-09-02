import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, BookOpen, DollarSign, TrendingUp, ArrowRight,
  ChevronRight, ArrowUpRight, ArrowDownRight, Building2,
  GraduationCap, BarChart2, ChevronUp, ChevronDown, Search,
} from 'lucide-react';
import {
  AreaChart, Area, ComposedChart, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, Modal, DateRangePicker, SkeletonStatCard } from '../../components/ui';
import adminService from '../../services/adminService';
import {
  getRevenueAnalytics,
  getTrendsAnalytics,
  getInstructorsAnalytics,
} from '../../services/instructorService';

const PERIODS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

const SECTION_COLORS = {
  'maily-academia': '#4A90A4',
  'longevity-360': '#22c55e',
  'corporativo-camsa': '#8b5cf6',
};

const PIE_COLORS = ['#4A90A4', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444'];
const ROLE_LABELS = { student: 'Estudiantes', instructor: 'Profesores', admin: 'Admins' };

// ─── KPI Card ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, subtitle, trend, color, onDetail, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card className="p-6 h-full flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
          </div>
        </div>
        {trend && (
          <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend === 'up'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {subtitle}
          </span>
        )}
      </div>
      {!trend && subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-16">{subtitle}</p>
      )}
      {onDetail && (
        <button
          onClick={onDetail}
          className="mt-4 ml-16 flex items-center gap-1 text-xs text-maily hover:text-maily/70 font-medium transition-colors"
        >
          Ver detalles <ChevronRight size={13} />
        </button>
      )}
    </Card>
  </motion.div>
);

// ─── Section Card ───────────────────────────────────────────────────────────────
const SectionCard = ({ sec, delay = 0 }) => {
  const color = SECTION_COLORS[sec.slug] || '#4A90A4';
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="p-5 h-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{sec.name}</h3>
            <span className="text-xs text-gray-400 capitalize">{sec.section_type}</span>
          </div>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Usuarios', val: sec.users },
            { label: 'Profesores', val: sec.instructors },
            { label: 'Cursos', val: sec.published_courses },
            {
              label: 'Ingresos mes',
              val: `$${sec.revenue_this_month.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
              green: true,
            },
          ].map(({ label, val, green }) => (
            <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 text-center">
              <p className={`text-lg font-bold ${green ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                {val}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-gray-100 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{sec.total_enrollments}</span> inscripciones totales
        </div>
      </Card>
    </motion.div>
  );
};

// ─── Helpers de formato ────────────────────────────────────────────────────────
const formatMXN = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount ?? 0);

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// ─── Componente TrendBadge ──────────────────────────────────────────────────────
const TrendBadge = ({ value, suffix = '' }) => {
  if (value == null) return null;
  const isUp = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
      isUp
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [revenue, setRevenue] = useState(null);
  const [usersAnalytics, setUsersAnalytics] = useState(null);
  const [coursesAnalytics, setCoursesAnalytics] = useState(null);
  const [sectionsAnalytics, setSectionsAnalytics] = useState(null);
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null); // 'revenue' | 'users' | 'courses' | 'completion'

  // ── Estado: Revenue con DateRangePicker ──
  const [rangeStart, setRangeStart] = useState(daysAgoStr(29));
  const [rangeEnd, setRangeEnd] = useState(todayStr());
  const [groupBy, setGroupBy] = useState('day');
  const [rangeRevenue, setRangeRevenue] = useState(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  // ── Estado: Tendencias ──
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(true);

  // ── Estado: Tabla de instructores ──
  const [instructors, setInstructors] = useState(null);
  const [instructorsLoading, setInstructorsLoading] = useState(true);
  const [instrSearch, setInstrSearch] = useState('');
  const [instrSort, setInstrSort] = useState({ col: 'revenue', dir: 'desc' });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rev, users, courses, sections] = await Promise.all([
          adminService.getRevenueAnalytics({ period }).catch(() => null),
          adminService.getUsersAnalytics().catch(() => null),
          adminService.getCoursesAnalytics().catch(() => null),
          adminService.getSectionsAnalytics().catch(() => null),
        ]);
        setRevenue(rev);
        setUsersAnalytics(users);
        setCoursesAnalytics(courses);
        setSectionsAnalytics(sections);
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
  }, [period]);

  // Cargar tendencias e instructores al montar
  useEffect(() => {
    getTrendsAnalytics()
      .then(setTrends)
      .catch(() => setTrends(null))
      .finally(() => setTrendsLoading(false));
    getInstructorsAnalytics()
      .then(setInstructors)
      .catch(() => setInstructors(null))
      .finally(() => setInstructorsLoading(false));
  }, []);

  // Cargar revenue por rango cuando cambia el filtro
  useEffect(() => {
    if (!rangeStart || !rangeEnd) return;
    let cancelled = false;
    const load = async () => {
      setRangeLoading(true);
      try {
        const data = await getRevenueAnalytics(rangeStart, rangeEnd, null, groupBy);
        if (!cancelled) setRangeRevenue(data);
      } catch {
        if (!cancelled) setRangeRevenue(null);
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [rangeStart, rangeEnd, groupBy]);

  const usersSectionData = usersAnalytics?.users_by_section
    ? Object.entries(usersAnalytics.users_by_section).map(([name, value]) => ({ name, value }))
    : [];

  const usersRoleData = usersAnalytics?.users_by_role
    ? Object.entries(usersAnalytics.users_by_role).map(([role, value]) => ({
        name: ROLE_LABELS[role] || role,
        value,
      }))
    : [];

  // Tabla instructores: filtrado + ordenado
  const filteredInstructors = useMemo(() => {
    const list = Array.isArray(instructors) ? instructors : (instructors?.results ?? []);
    const q = instrSearch.toLowerCase().trim();
    const filtered = q
      ? list.filter((i) => (i.name ?? i.full_name ?? '').toLowerCase().includes(q))
      : list;
    const { col, dir } = instrSort;
    return [...filtered].sort((a, b) => {
      const va = a[col] ?? 0;
      const vb = b[col] ?? 0;
      return dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [instructors, instrSearch, instrSort]);

  const handleInstrSort = (col) => {
    setInstrSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' }
    );
  };

  const SortIcon = ({ col }) => {
    if (instrSort.col !== col) return <ChevronUp size={12} className="text-gray-300 dark:text-gray-600" />;
    return instrSort.dir === 'asc'
      ? <ChevronUp size={12} className="text-blue-500" />
      : <ChevronDown size={12} className="text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin mt-24" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Administración</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Métricas e ingresos de la plataforma</p>
      </div>

      {/* ── Fila 1: KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          delay={0}
          icon={<DollarSign size={22} />}
          label="Ingresos del mes"
          value={revenue?.total_revenue != null
            ? `$${Number(revenue.total_revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            : '-'}
          subtitle={revenue?.comparison?.vs_previous_period || 'N/A'}
          trend={revenue?.comparison?.trend}
          color="text-green-600 bg-green-100 dark:bg-green-900/30"
          onDetail={() => setDetailModal('revenue')}
        />
        <KpiCard
          delay={0.05}
          icon={<Users size={22} />}
          label="Usuarios nuevos (mes)"
          value={usersAnalytics?.new_users_this_month ?? '-'}
          subtitle={`${usersAnalytics?.active_users_last_7d ?? 0} activos últimos 7 días`}
          color="text-blue-600 bg-blue-100 dark:bg-blue-900/30"
          onDetail={() => setDetailModal('users')}
        />
        <KpiCard
          delay={0.1}
          icon={<BookOpen size={22} />}
          label="Cursos vendidos"
          value={revenue?.total_purchases ?? '-'}
          subtitle={`${coursesAnalytics?.total_enrollments ?? 0} inscripciones totales`}
          color="text-orange-600 bg-orange-100 dark:bg-orange-900/30"
          onDetail={() => setDetailModal('courses')}
        />
        <KpiCard
          delay={0.15}
          icon={<TrendingUp size={22} />}
          label="Tasa completitud media"
          value={coursesAnalytics?.avg_completion_rate != null ? `${coursesAnalytics.avg_completion_rate}%` : '-'}
          subtitle={`${coursesAnalytics?.published_courses ?? 0} cursos publicados`}
          color="text-purple-600 bg-purple-100 dark:bg-purple-900/30"
          onDetail={() => setDetailModal('completion')}
        />
      </div>

      {/* ── Fila 2: Comparativa por Academia ── */}
      {(sectionsAnalytics?.sections?.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={20} className="text-maily" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Comparativa por Academia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sectionsAnalytics.sections.map((sec, i) => (
              <SectionCard key={sec.slug} sec={sec} delay={i * 0.07} />
            ))}
          </div>
        </div>
      )}

      {/* ── Fila 3: Gráfico Ingresos + Compras ── */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <DollarSign size={20} className="text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ingresos y Compras</h2>
            {revenue?.comparison?.vs_previous_period && revenue.comparison.vs_previous_period !== 'N/A' && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                revenue.comparison.trend === 'up'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {revenue.comparison.vs_previous_period} vs período anterior
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  period === p.value
                    ? 'bg-maily text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {(revenue?.data?.length > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={revenue.data} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) =>
                  name === 'Ingresos'
                    ? [`$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, name]
                    : [value, name]
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Ingresos" fill="#059669" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="purchases" name="Compras" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-10 text-center">No hay datos para el período seleccionado.</p>
        )}
      </Card>

      {/* ── Fila 4: Tendencia de registros + Pies de usuarios ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Registrations trend */}
        <Card className="lg:col-span-3 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users size={18} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tendencia de Registros</h2>
            <span className="text-xs text-gray-400">(últimos 12 meses)</span>
          </div>
          {(usersAnalytics?.registrations_trend?.length > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={usersAnalytics.registrations_trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Registros']} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Registros"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-10 text-center">Sin datos de tendencia.</p>
          )}
        </Card>

        {/* Two pies stacked */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-maily" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Distribución Usuarios</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Por Academia</p>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={usersSectionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                    {usersSectionData.map((entry, i) => (
                      <Cell key={i} fill={SECTION_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Por Rol</p>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={usersRoleData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={25}>
                    {usersRoleData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Fila 5: Top cursos (revenue + inscripciones) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Cursos por Ingresos</h2>
            </div>
            <Link to="/admin/courses" className="text-maily hover:underline text-xs flex items-center gap-1">
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          {(coursesAnalytics?.top_courses_by_revenue?.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Curso</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Ingresos</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Compras</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesAnalytics.top_courses_by_revenue.slice(0, 8).map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 text-gray-900 dark:text-white truncate max-w-[180px]">{c.title}</td>
                      <td className="py-2 text-right font-medium text-green-600 dark:text-green-400">
                        ${Number(c.revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right text-gray-500 dark:text-gray-400">{c.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-6 text-center">Aún no hay compras.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top por Inscripciones</h2>
            </div>
          </div>
          {(coursesAnalytics?.top_courses_by_enrollments?.length > 0) ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">#</th>
                    <th className="text-left py-2 font-medium text-gray-500 dark:text-gray-400">Curso</th>
                    <th className="text-right py-2 font-medium text-gray-500 dark:text-gray-400">Inscritos</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesAnalytics.top_courses_by_enrollments.slice(0, 8).map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2 text-xs font-bold text-gray-400 w-8">#{i + 1}</td>
                      <td className="py-2 text-gray-900 dark:text-white truncate max-w-[200px]">{c.title}</td>
                      <td className="py-2 text-right font-semibold text-blue-600 dark:text-blue-400">{c.enrollments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-6 text-center">Sin inscripciones aún.</p>
          )}
        </Card>
      </div>

      {/* ── Fila 6: Cursos por Categoría ── */}
      {(coursesAnalytics?.courses_by_category?.length > 0) && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen size={18} className="text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cursos por Categoría</h2>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(160, coursesAnalytics.courses_by_category.length * 36)}>
            <BarChart
              data={coursesAnalytics.courses_by_category}
              layout="vertical"
              margin={{ top: 0, right: 30, bottom: 0, left: 90 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={85} />
              <Tooltip formatter={(v) => [v, 'Cursos']} />
              <Bar dataKey="count" name="Cursos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ══ SECCIÓN A: Revenue con DateRangePicker ══ */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue por Período</h2>
          </div>
          {/* Granularidad */}
          <div className="flex gap-2">
            {[
              { value: 'day', label: 'Día' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Mes' },
            ].map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGroupBy(g.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  groupBy === g.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* DateRangePicker */}
        <DateRangePicker
          startDate={rangeStart}
          endDate={rangeEnd}
          onChange={(s, e) => { setRangeStart(s); setRangeEnd(e); }}
          maxDays={365}
          className="mb-5"
        />

        {/* Cards de totales */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
            <p className="text-xs text-indigo-500 dark:text-indigo-400 font-medium uppercase tracking-wider mb-1">Revenue total</p>
            <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              {rangeLoading ? '...' : formatMXN(rangeRevenue?.total_revenue ?? 0)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">Vs período anterior</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {rangeLoading ? '...' : (rangeRevenue?.comparison?.vs_previous_period ?? 'N/A')}
                </p>
                {!rangeLoading && rangeRevenue?.comparison?.change_pct != null && (
                  <TrendBadge value={rangeRevenue.comparison.change_pct} suffix="%" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Gráfica de área */}
        {rangeLoading ? (
          <div className="flex justify-center items-center h-[260px]">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (rangeRevenue?.data?.length > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={rangeRevenue.data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'revenue' || name === 'Ingresos')
                    return [formatMXN(value), 'Ingresos'];
                  return [value, 'Compras'];
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend formatter={(v) => (v === 'revenue' ? 'Ingresos' : v === 'purchases' ? 'Compras' : v)} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Ingresos"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#6366f1' }}
              />
              <Area
                type="monotone"
                dataKey="purchases"
                name="Compras"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="none"
                dot={false}
                activeDot={{ r: 4, fill: '#f59e0b' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-10 text-center">
            No hay datos para el rango de fechas seleccionado.
          </p>
        )}
      </Card>

      {/* ══ SECCIÓN B: Comparativa Mes Actual vs Anterior + Tendencias ══ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-maily" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tendencias y Comparativa</h2>
        </div>

        {/* 4 tarjetas de métricas */}
        {trendsLoading ? (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[0, 1, 2, 3].map((i) => <SkeletonStatCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            {[
              {
                label: 'Revenue',
                value: formatMXN(trends?.current?.revenue),
                change: trends?.changes?.revenue_pct,
                color: 'text-green-600 dark:text-green-400',
                bg: 'bg-green-50 dark:bg-green-900/20',
              },
              {
                label: 'Inscripciones',
                value: trends?.current?.enrollments ?? 0,
                change: trends?.changes?.enrollments_pct,
                color: 'text-blue-600 dark:text-blue-400',
                bg: 'bg-blue-50 dark:bg-blue-900/20',
              },
              {
                label: 'Completaciones',
                value: trends?.current?.completions ?? 0,
                change: trends?.changes?.completions_pct,
                color: 'text-purple-600 dark:text-purple-400',
                bg: 'bg-purple-50 dark:bg-purple-900/20',
              },
              {
                label: 'Estudiantes activos',
                value: trends?.current?.active_students ?? 0,
                change: trends?.changes?.active_students_pct,
                color: 'text-orange-600 dark:text-orange-400',
                bg: 'bg-orange-50 dark:bg-orange-900/20',
              },
            ].map(({ label, value, change, color, bg }) => (
              <div key={label} className={`rounded-xl p-4 ${bg}`}>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <div className="mt-2">
                  <TrendBadge value={change} suffix="%" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">vs mes anterior</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BarChart últimos 6 meses */}
        {!trendsLoading && (trends?.monthly_comparison?.length > 0) && (
          <Card className="p-6">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Inscripciones y Revenue — últimos 6 meses</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trends.monthly_comparison} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'revenue' || name === 'Revenue')
                      return [formatMXN(value), 'Revenue'];
                    return [value, 'Inscripciones'];
                  }}
                />
                <Legend formatter={(v) => (v === 'revenue' ? 'Revenue' : v === 'enrollments' ? 'Inscripciones' : v)} />
                <Bar yAxisId="left" dataKey="enrollments" name="Inscripciones" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ══ SECCIÓN C: Tabla de Instructores ══ */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={20} className="text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Instructores</h2>
          </div>
          {/* Búsqueda */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar instructor..."
              value={instrSearch}
              onChange={(e) => setInstrSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-52"
            />
          </div>
        </div>

        <Card className="overflow-x-auto">
          {instructorsLoading ? (
            <div className="p-6 space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredInstructors.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-10 text-center">
              {instrSearch ? 'No se encontraron instructores con ese nombre.' : 'No hay datos de instructores.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  {[
                    { col: 'name', label: 'Instructor' },
                    { col: 'courses_count', label: 'Cursos' },
                    { col: 'total_students', label: 'Estudiantes' },
                    { col: 'active_students', label: 'Activos' },
                    { col: 'revenue', label: 'Revenue' },
                    { col: 'completion_rate', label: 'Completación' },
                    { col: null, label: 'Top Curso' },
                  ].map(({ col, label }) => (
                    <th
                      key={label}
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap ${col ? 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200' : ''}`}
                      onClick={col ? () => handleInstrSort(col) : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        {col && <SortIcon col={col} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredInstructors.map((inst, idx) => {
                  const name = inst.name ?? inst.full_name ?? inst.username ?? `Instructor #${idx + 1}`;
                  return (
                    <tr key={inst.id ?? idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {inst.avatar ? (
                            <img src={inst.avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[140px]">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                        {inst.courses_count ?? inst.courses ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                        {inst.total_students ?? inst.students ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {inst.active_students ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400 whitespace-nowrap">
                        {formatMXN(inst.revenue ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inst.completion_rate != null ? (
                          <span className={`font-medium ${
                            inst.completion_rate >= 70
                              ? 'text-green-600 dark:text-green-400'
                              : inst.completion_rate >= 40
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}>
                            {Number(inst.completion_rate).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[160px]">
                        <span className="truncate block text-xs">
                          {inst.top_course ?? inst.top_course_title ?? '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Links de acceso rápido ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Usuarios</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {usersAnalytics?.total_users ?? 0} total · {usersAnalytics?.active_users_last_7d ?? 0} activos (7d)
                </p>
              </div>
            </div>
            <Link to="/admin/users" className="text-maily hover:underline text-sm flex items-center gap-1">
              Gestionar <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-orange-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Cursos</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {coursesAnalytics?.published_courses ?? 0} publicados · {coursesAnalytics?.total_enrollments ?? 0} inscripciones
                </p>
              </div>
            </div>
            <Link to="/admin/courses" className="text-maily hover:underline text-sm flex items-center gap-1">
              Gestionar <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </div>

      {/* ══ MODALES ══ */}

      {/* Modal: Ingresos */}
      <Modal
        isOpen={detailModal === 'revenue'}
        onClose={() => setDetailModal(null)}
        title="Detalle de Ingresos"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Ingresos este mes por academia</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(sectionsAnalytics?.sections || []).map((sec) => (
                <div key={sec.slug} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: SECTION_COLORS[sec.slug] || '#888' }} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{sec.name}</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${sec.revenue_this_month.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top 5 cursos por ingresos</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(coursesAnalytics?.top_courses_by_revenue || []).slice(0, 5).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-[220px]">{c.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400 ml-2">
                    ${Number(c.revenue).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${Number(revenue?.total_revenue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ingresos totales (período)</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{revenue?.total_purchases ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Compras totales (período)</p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Usuarios */}
      <Modal
        isOpen={detailModal === 'users'}
        onClose={() => setDetailModal(null)}
        title="Detalle de Usuarios"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', val: usersAnalytics?.total_users ?? 0, color: 'text-gray-900 dark:text-white' },
              { label: 'Nuevos este mes', val: usersAnalytics?.new_users_this_month ?? 0, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Activos 7 días', val: usersAnalytics?.active_users_last_7d ?? 0, color: 'text-green-600 dark:text-green-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Registros últimos 12 meses</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={usersAnalytics?.registrations_trend || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Registros']} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Por academia</p>
            {Object.entries(usersAnalytics?.users_by_section || {}).map(([slug, count]) => (
              <div key={slug} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTION_COLORS[slug] || '#888' }} />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{slug}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count} usuarios</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal: Cursos */}
      <Modal
        isOpen={detailModal === 'courses'}
        onClose={() => setDetailModal(null)}
        title="Detalle de Cursos"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total cursos', val: coursesAnalytics?.total_courses ?? 0, color: 'text-gray-900 dark:text-white' },
              { label: 'Publicados', val: coursesAnalytics?.published_courses ?? 0, color: 'text-green-600 dark:text-green-400' },
              { label: 'Inscripciones', val: coursesAnalytics?.total_enrollments ?? 0, color: 'text-blue-600 dark:text-blue-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top 10 por inscripciones</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(coursesAnalytics?.top_courses_by_enrollments || []).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-[210px]">{c.title}</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 ml-2">{c.enrollments}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Completitud */}
      <Modal
        isOpen={detailModal === 'completion'}
        onClose={() => setDetailModal(null)}
        title="Detalle de Completitud"
      >
        <div className="space-y-5">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5 text-center">
            <p className="text-5xl font-bold text-purple-600 dark:text-purple-400">
              {coursesAnalytics?.avg_completion_rate ?? 0}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Tasa de completitud promedio de la plataforma</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cursos con más alumnos inscritos</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {(coursesAnalytics?.top_courses_by_enrollments || []).slice(0, 8).map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200 truncate max-w-[210px]">{c.title}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 ml-2">{c.enrollments} alumnos</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
