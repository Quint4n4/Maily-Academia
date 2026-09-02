import { Gift, Calendar, Send } from 'lucide-react';
import { CAMSA } from '../../theme/camsaTheme';

export default function BenefitCard({ benefit, onBook, onRequest }) {
  const isAppointment = benefit.benefit_mode === 'appointment';
  const color = benefit.color || CAMSA.gold;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 border transition-all hover:scale-[1.01] cursor-pointer"
      style={{
        backgroundColor: CAMSA.bgCard,
        borderColor: CAMSA.border,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}22` }}
        >
          <Gift size={20} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold" style={{ color: CAMSA.textPrimary }}>
            {benefit.name}
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isAppointment
                ? 'rgba(99,179,237,0.15)'
                : 'rgba(154,230,180,0.15)',
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
        onClick={() =>
          isAppointment ? onBook?.(benefit.slug) : onRequest?.(benefit)
        }
        className="w-full py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-80 flex items-center justify-center gap-2 mt-auto"
        style={{ backgroundColor: color, color: '#000' }}
      >
        {isAppointment ? (
          <>
            <Calendar size={15} /> Agendar Cita
          </>
        ) : (
          <>
            <Send size={15} /> Solicitar
          </>
        )}
      </button>
    </div>
  );
}
