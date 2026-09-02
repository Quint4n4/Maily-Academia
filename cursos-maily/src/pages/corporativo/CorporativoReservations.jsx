import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAMSA } from '../../theme/camsaTheme';
import { useToast } from '../../context/ToastContext';
import corporateService from '../../services/corporateService';
import { Calendar, Clock, Send, X } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#f6c90e', bg: 'rgba(246,201,14,0.15)' },
  confirmed: { label: 'Confirmada', color: '#63b3ed', bg: 'rgba(99,179,237,0.15)' },
  cancelled: { label: 'Cancelada', color: '#fc8181', bg: 'rgba(252,129,129,0.15)' },
  completed: { label: 'Completada', color: '#9ae6b4', bg: 'rgba(154,230,180,0.15)' },
  no_show: { label: 'No se presentó', color: '#fbd38d', bg: 'rgba(251,211,141,0.15)' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#888', bg: 'rgba(136,136,136,0.15)' };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export default function CorporativoReservations() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [reservations, setReservations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reservations');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    try {
      const [res, reqs] = await Promise.all([
        corporateService.getMyReservations(),
        corporateService.getMyRequests(),
      ]);
      setReservations(Array.isArray(res) ? res : res.results || []);
      setRequests(Array.isArray(reqs) ? reqs : reqs.results || []);
    } catch {
      showToast('Error al cargar tus citas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await corporateService.cancelReservation(cancelModal.id, cancelReason);
      showToast('Cita cancelada', 'success');
      setCancelModal(null);
      setCancelReason('');
      loadData();
    } catch (err) {
      showToast(err?.response?.data?.detail || 'No se pudo cancelar', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: CAMSA.bg }}>
        <div
          className="w-10 h-10 border-4 rounded-full animate-spin"
          style={{ borderColor: CAMSA.gold, borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: CAMSA.bg, color: CAMSA.textPrimary }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: CAMSA.gold }}>
              Mis Citas y Solicitudes
            </h1>
            <p style={{ color: CAMSA.textMuted }}>Historial y estado de tus beneficios</p>
          </div>
          <button
            onClick={() => navigate('/corporativo/benefits')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: CAMSA.gold, color: '#000' }}
          >
            Nueva cita
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-2 mb-6 p-1 rounded-lg"
          style={{ backgroundColor: CAMSA.bgCard }}
        >
          {[
            { key: 'reservations', label: `Citas (${reservations.length})` },
            { key: 'requests', label: `Solicitudes (${requests.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: activeTab === tab.key ? CAMSA.gold : 'transparent',
                color: activeTab === tab.key ? '#000' : CAMSA.textMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista de citas */}
        {activeTab === 'reservations' && (
          <div className="space-y-3">
            {reservations.length === 0 ? (
              <div className="text-center py-12" style={{ color: CAMSA.textDim }}>
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>No tienes citas agendadas</p>
                <button
                  onClick={() => navigate('/corporativo/benefits')}
                  className="mt-3 text-sm underline"
                  style={{ color: CAMSA.gold }}
                >
                  Agendar ahora
                </button>
              </div>
            ) : (
              reservations.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl p-4 border flex items-center gap-4"
                  style={{
                    backgroundColor: CAMSA.bgCard,
                    borderColor: CAMSA.border,
                    borderLeftWidth: 3,
                    borderLeftColor: r.benefit_type_color || CAMSA.gold,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium" style={{ color: CAMSA.textPrimary }}>
                        {r.benefit_type_name}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div
                      className="flex items-center gap-3 text-sm"
                      style={{ color: CAMSA.textMuted }}
                    >
                      <span className="flex items-center gap-1">
                        <Calendar size={13} />
                        {r.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} />
                        {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                  {(r.status === 'pending' || r.status === 'confirmed') && (
                    <button
                      onClick={() => setCancelModal(r)}
                      className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
                      style={{ color: '#fc8181', border: '1px solid rgba(252,129,129,0.3)' }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Lista de solicitudes */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="text-center py-12" style={{ color: CAMSA.textDim }}>
                <Send size={40} className="mx-auto mb-3 opacity-30" />
                <p>No tienes solicitudes registradas</p>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-xl p-4 border"
                  style={{ backgroundColor: CAMSA.bgCard, borderColor: CAMSA.border }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium" style={{ color: CAMSA.textPrimary }}>
                      {req.benefit_type_name}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-xs" style={{ color: CAMSA.textDim }}>
                    {new Date(req.created_at).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {req.admin_notes && (
                    <p
                      className="mt-2 text-sm p-2 rounded"
                      style={{ backgroundColor: CAMSA.goldGlow, color: CAMSA.textMuted }}
                    >
                      <strong>Admin:</strong> {req.admin_notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal de cancelación */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="rounded-xl p-6 w-full max-w-sm"
            style={{ backgroundColor: CAMSA.bgCard, border: `1px solid ${CAMSA.border}` }}
          >
            <h3 className="font-semibold mb-2" style={{ color: CAMSA.gold }}>
              Cancelar cita
            </h3>
            <p className="text-sm mb-4" style={{ color: CAMSA.textMuted }}>
              ¿Seguro que deseas cancelar tu cita de{' '}
              <strong>{cancelModal.benefit_type_name}</strong> el {cancelModal.date}?
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo de cancelación (opcional)"
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none border mb-4"
              style={{
                backgroundColor: CAMSA.bgSurface,
                borderColor: CAMSA.border,
                color: CAMSA.textPrimary,
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ color: CAMSA.textMuted, border: `1px solid ${CAMSA.border}` }}
              >
                No cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: '#fc8181', color: '#fff' }}
              >
                {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
