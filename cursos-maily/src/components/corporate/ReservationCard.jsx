import { Calendar, Clock } from 'lucide-react';
import { CAMSA } from '../../theme/camsaTheme';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: '#f6c90e', bg: 'rgba(246,201,14,0.15)' },
  confirmed: { label: 'Confirmada', color: '#63b3ed', bg: 'rgba(99,179,237,0.15)' },
  cancelled: { label: 'Cancelada', color: '#fc8181', bg: 'rgba(252,129,129,0.15)' },
  completed: { label: 'Completada', color: '#9ae6b4', bg: 'rgba(154,230,180,0.15)' },
  no_show: { label: 'No se presentó', color: '#fbd38d', bg: 'rgba(251,211,141,0.15)' },
};

export default function ReservationCard({ reservation, onCancel }) {
  const cfg = STATUS_CONFIG[reservation.status] || {
    label: reservation.status,
    color: '#888',
    bg: 'rgba(136,136,136,0.15)',
  };
  const canCancel =
    reservation.status === 'pending' || reservation.status === 'confirmed';

  return (
    <div
      className="rounded-xl p-4 border flex items-center gap-4"
      style={{
        backgroundColor: CAMSA.bgCard,
        borderColor: CAMSA.border,
        borderLeftWidth: 3,
        borderLeftColor: reservation.benefit_type_color || CAMSA.gold,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium" style={{ color: CAMSA.textPrimary }}>
            {reservation.benefit_type_name}
          </span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ color: cfg.color, backgroundColor: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>
        <div
          className="flex items-center gap-3 text-sm"
          style={{ color: CAMSA.textMuted }}
        >
          <span className="flex items-center gap-1">
            <Calendar size={13} />
            {reservation.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {reservation.start_time?.slice(0, 5)} – {reservation.end_time?.slice(0, 5)}
          </span>
        </div>
        {reservation.notes && (
          <p className="text-xs mt-1 truncate" style={{ color: CAMSA.textDim }}>
            {reservation.notes}
          </p>
        )}
      </div>

      {canCancel && onCancel && (
        <button
          onClick={() => onCancel(reservation)}
          className="text-xs px-3 py-1 rounded-lg flex-shrink-0 transition-opacity hover:opacity-70"
          style={{ color: '#fc8181', border: '1px solid rgba(252,129,129,0.3)' }}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}
