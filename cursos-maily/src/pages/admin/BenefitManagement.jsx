import { useState, useEffect } from 'react';
import {
  Gift, Calendar, Clock, Send, Plus, Edit2, Trash2,
  CheckCircle, XCircle, Package, Settings, CalendarDays,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import corporateService from '../../services/corporateService';
import { useToast } from '../../context/ToastContext';
import BenefitFormModal from './BenefitFormModal';

const STATUS_REQUEST = {
  pending:   { label: 'Pendiente',  cls: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-400/10' },
  approved:  { label: 'Aprobado',   cls: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-400/10' },
  rejected:  { label: 'Rechazado',  cls: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-400/10' },
  delivered: { label: 'Entregado',  cls: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-400/10' },
};

export default function BenefitManagement() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]           = useState('benefits');
  const [benefits, setBenefits]             = useState([]);
  const [requests, setRequests]             = useState([]);
  const [stats, setStats]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [showModal, setShowModal]           = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);

  const loadData = async () => {
    try {
      const [ben, req, st] = await Promise.all([
        corporateService.adminGetBenefits(),
        corporateService.adminGetRequests({ status: 'pending' }),
        corporateService.adminGetCorporateStats(),
      ]);
      setBenefits(Array.isArray(ben) ? ben : ben.results || []);
      setRequests(Array.isArray(req) ? req : req.results || []);
      setStats(st);
    } catch {
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este beneficio? Se eliminarán también sus horarios.')) return;
    try {
      await corporateService.adminDeleteBenefit(id);
      showToast('Beneficio eliminado', 'success');
      loadData();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleToggleActive = async (benefit) => {
    try {
      await corporateService.adminUpdateBenefit(benefit.id, { is_active: !benefit.is_active });
      showToast(`Beneficio ${benefit.is_active ? 'desactivado' : 'activado'}`, 'success');
      loadData();
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleRequestAction = async (id, status) => {
    try {
      await corporateService.adminUpdateRequest(id, { status });
      const label =
        status === 'approved' ? 'aprobada'
        : status === 'rejected' ? 'rechazada'
        : 'entregada';
      showToast(`Solicitud ${label}`, 'success');
      loadData();
    } catch {
      showToast('Error al procesar solicitud', 'error');
    }
  };

  const appointmentBenefits = benefits.filter((b) => b.benefit_mode === 'appointment' && b.is_active).length;
  const requestBenefits     = benefits.filter((b) => b.benefit_mode === 'request'     && b.is_active).length;

  return (
    <div className="p-6 min-h-screen">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Beneficios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Administra los beneficios corporativos CAMSA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/corporate/reservations')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <CalendarDays size={16} /> Ver Citas
          </button>
          <button
            onClick={() => { setEditingBenefit(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Nuevo Beneficio
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Beneficios',        value: benefits.length,                     icon: Gift,     color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-400/10' },
          { label: 'Tipo Cita Activos',       value: appointmentBenefits,                 icon: Calendar, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-400/10'   },
          { label: 'Tipo Solicitud Activos',  value: requestBenefits,                     icon: Send,     color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-400/10' },
          { label: 'Citas Este Mes',          value: stats?.reservations_this_month || 0, icon: Clock,    color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-400/10' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('benefits')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'benefits'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Beneficios ({benefits.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Solicitudes Pendientes ({requests.length})
        </button>
      </div>

      {/* ── Tabla de beneficios ── */}
      {activeTab === 'benefits' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">Límite</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td>
                </tr>
              ) : benefits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    No hay beneficios creados
                  </td>
                </tr>
              ) : benefits.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color || '#e6c364' }}
                      />
                      <span className="text-gray-900 dark:text-white font-medium">{b.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.benefit_mode === 'appointment'
                        ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-400/10'
                        : 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-400/10'
                    }`}>
                      {b.benefit_mode === 'appointment' ? 'Cita' : 'Solicitud'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400 text-sm">
                    {b.max_per_employee === 0
                      ? 'Ilimitado'
                      : `${b.max_per_employee}/${
                          b.limit_period === 'monthly' ? 'mes'
                          : b.limit_period === 'yearly' ? 'año'
                          : 'total'
                        }`}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      b.is_active
                        ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-400/10'
                        : 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-600/30'
                    }`}>
                      {b.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingBenefit(b); setShowModal(true); }}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      {b.benefit_mode === 'appointment' && (
                        <button
                          onClick={() =>
                            navigate('/admin/corporate/schedules', {
                              state: { benefitId: b.id, benefitName: b.name },
                            })
                          }
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Horarios"
                        >
                          <Settings size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(b)}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          b.is_active
                            ? 'text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                            : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                        title={b.is_active ? 'Desactivar' : 'Activar'}
                      >
                        {b.is_active ? <XCircle size={15} /> : <CheckCircle size={15} />}
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tabla de solicitudes pendientes ── */}
      {activeTab === 'requests' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Empleado</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Beneficio</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">Estado</th>
                <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">Cargando...</td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">
                    No hay solicitudes pendientes
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{req.user_name}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{req.benefit_type_name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_REQUEST[req.status]?.cls || ''}`}>
                      {STATUS_REQUEST[req.status]?.label || req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                    {new Date(req.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleRequestAction(req.id, 'approved')}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Aprobar"
                      >
                        <CheckCircle size={15} />
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.id, 'delivered')}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Marcar entregado"
                      >
                        <Package size={15} />
                      </button>
                      <button
                        onClick={() => handleRequestAction(req.id, 'rejected')}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Rechazar"
                      >
                        <XCircle size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <BenefitFormModal
          benefit={editingBenefit}
          onClose={() => { setShowModal(false); setEditingBenefit(null); }}
          onSave={() => { setShowModal(false); setEditingBenefit(null); loadData(); }}
        />
      )}
    </div>
  );
}
