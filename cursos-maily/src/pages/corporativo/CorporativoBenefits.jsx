import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAMSA } from '../../theme/camsaTheme';
import { useToast } from '../../context/ToastContext';
import corporateService from '../../services/corporateService';
import { Gift, Calendar, Send, X } from 'lucide-react';

// Tarjeta inline de beneficio
function BenefitCard({ benefit, onBook, onRequest }) {
  const isAppointment = benefit.benefit_mode === 'appointment';
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 border transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: CAMSA.bgCard,
        borderColor: CAMSA.border,
        borderLeftWidth: 3,
        borderLeftColor: benefit.color || CAMSA.gold,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${benefit.color || CAMSA.gold}22` }}
        >
          <Gift size={20} style={{ color: benefit.color || CAMSA.gold }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold" style={{ color: CAMSA.textPrimary }}>
            {benefit.name}
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isAppointment ? 'rgba(99,179,237,0.15)' : 'rgba(154,230,180,0.15)',
              color: isAppointment ? '#63b3ed' : '#9ae6b4',
            }}
          >
            {isAppointment ? 'Requiere cita' : 'Solicitud'}
          </span>
        </div>
      </div>
      {benefit.description && (
        <p className="text-sm" style={{ color: CAMSA.textMuted }}>
          {benefit.description}
        </p>
      )}
      {benefit.instructions && (
        <p className="text-xs italic" style={{ color: CAMSA.textDim }}>
          {benefit.instructions}
        </p>
      )}
      {benefit.max_per_employee > 0 && (
        <p className="text-xs" style={{ color: CAMSA.textDim }}>
          Límite: {benefit.max_per_employee} por{' '}
          {benefit.limit_period === 'monthly'
            ? 'mes'
            : benefit.limit_period === 'yearly'
            ? 'año'
            : 'total'}
        </p>
      )}
      <button
        onClick={() => (isAppointment ? onBook(benefit.slug) : onRequest(benefit))}
        className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
        style={{ backgroundColor: CAMSA.gold, color: '#000' }}
      >
        {isAppointment ? (
          <>
            <Calendar size={16} /> Agendar Cita
          </>
        ) : (
          <>
            <Send size={16} /> Solicitar
          </>
        )}
      </button>
    </div>
  );
}

// Modal de solicitud rápida
function RequestModal({ benefit, onClose, onConfirm, loading }) {
  const [notes, setNotes] = useState('');
  if (!benefit) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div
        className="rounded-xl p-6 w-full max-w-md"
        style={{ backgroundColor: CAMSA.bgCard, border: `1px solid ${CAMSA.border}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" style={{ color: CAMSA.gold }}>
            Solicitar: {benefit.name}
          </h3>
          <button onClick={onClose}>
            <X size={20} style={{ color: CAMSA.textDim }} />
          </button>
        </div>
        {benefit.instructions && (
          <p
            className="text-sm mb-4 p-3 rounded-lg"
            style={{ backgroundColor: CAMSA.goldGlow, color: CAMSA.textMuted }}
          >
            {benefit.instructions}
          </p>
        )}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas adicionales (opcional)..."
          rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none border mb-4"
          style={{
            backgroundColor: CAMSA.bgSurface,
            borderColor: CAMSA.border,
            color: CAMSA.textPrimary,
          }}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ color: CAMSA.textMuted, border: `1px solid ${CAMSA.border}` }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(benefit.slug, notes)}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: CAMSA.gold, color: '#000' }}
          >
            {loading ? 'Enviando...' : 'Confirmar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CorporativoBenefits() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [benefits, setBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestingBenefit, setRequestingBenefit] = useState(null);
  const [requestLoading, setRequestLoading] = useState(false);

  useEffect(() => {
    corporateService
      .getBenefitTypes()
      .then((data) => setBenefits(Array.isArray(data) ? data : data.results || []))
      .catch(() => showToast('Error al cargar beneficios', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleBook = (slug) => navigate(`/corporativo/benefits/${slug}/book`);

  const handleConfirmRequest = async (slug, notes) => {
    setRequestLoading(true);
    try {
      await corporateService.requestBenefit(slug, notes);
      showToast('Solicitud enviada correctamente', 'success');
      setRequestingBenefit(null);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.[0] ||
        'Error al enviar solicitud';
      showToast(msg, 'error');
    } finally {
      setRequestLoading(false);
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: CAMSA.gold }}>
            Beneficios Corporativos
          </h1>
          <p style={{ color: CAMSA.textMuted }}>
            Explora los beneficios disponibles para empleados CAMSA
          </p>
        </div>

        {benefits.length === 0 ? (
          <div className="text-center py-16" style={{ color: CAMSA.textDim }}>
            <Gift size={48} className="mx-auto mb-4 opacity-30" />
            <p>No hay beneficios disponibles por el momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit) => (
              <BenefitCard
                key={benefit.id}
                benefit={benefit}
                onBook={handleBook}
                onRequest={setRequestingBenefit}
              />
            ))}
          </div>
        )}
      </div>

      <RequestModal
        benefit={requestingBenefit}
        onClose={() => setRequestingBenefit(null)}
        onConfirm={handleConfirmRequest}
        loading={requestLoading}
      />
    </div>
  );
}
