import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CAMSA } from '../../theme/camsaTheme';
import { useToast } from '../../context/ToastContext';
import corporateService from '../../services/corporateService';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function CorporativoCalendar() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDay.getDate()
    ).padStart(2, '0')}`;
    setLoading(true);
    corporateService
      .getMyReservations({ date_from: firstDay, date_to: lastDayStr })
      .then((data) => setReservations(Array.isArray(data) ? data : data.results || []))
      .catch(() => showToast('Error al cargar citas', 'error'))
      .finally(() => setLoading(false));
  }, [currentYear, currentMonth]);

  // Agrupar reservaciones por fecha
  const byDate = reservations.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < adjustedFirst; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handlePrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const selectedEvents = selectedDate ? byDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: CAMSA.bg }}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6" style={{ color: CAMSA.gold }}>
          Mi Calendario
        </h1>

        <div className="rounded-xl overflow-hidden mb-6" style={{ backgroundColor: CAMSA.bgCard }}>
          {/* Header mes */}
          <div
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: CAMSA.border }}
          >
            <button onClick={handlePrev} className="p-1 rounded hover:opacity-70">
              <ChevronLeft size={20} style={{ color: CAMSA.textMuted }} />
            </button>
            <h2 className="font-semibold" style={{ color: CAMSA.textPrimary }}>
              {MESES[currentMonth]} {currentYear}
            </h2>
            <button onClick={handleNext} className="p-1 rounded hover:opacity-70">
              <ChevronRight size={20} style={{ color: CAMSA.textMuted }} />
            </button>
          </div>

          <div className="p-4">
            {/* Días de la semana */}
            <div className="grid grid-cols-7 mb-2">
              {DIAS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium py-1"
                  style={{ color: CAMSA.textDim }}
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Celdas */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const events = byDate[dateStr] || [];
                const isToday =
                  today.getFullYear() === currentYear &&
                  today.getMonth() === currentMonth &&
                  today.getDate() === day;
                const isSelected = selectedDate === dateStr;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className="aspect-square flex flex-col items-center justify-start rounded-lg p-1 transition-all"
                    style={{
                      backgroundColor: isSelected ? CAMSA.goldGlow : 'transparent',
                      border: isToday
                        ? `1px solid ${CAMSA.goldBorder}`
                        : '1px solid transparent',
                    }}
                  >
                    <span
                      className="text-sm"
                      style={{ color: isToday ? CAMSA.gold : CAMSA.textPrimary }}
                    >
                      {day}
                    </span>
                    {events.length > 0 && (
                      <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                        {events.slice(0, 3).map((e, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: e.benefit_type_color || CAMSA.gold }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalle del día seleccionado */}
        {selectedDate && (
          <div className="rounded-xl p-4" style={{ backgroundColor: CAMSA.bgCard }}>
            <h3 className="font-semibold mb-3" style={{ color: CAMSA.gold }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm" style={{ color: CAMSA.textDim }}>
                No hay citas este día.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{
                      backgroundColor: CAMSA.bgSurface,
                      borderLeft: `3px solid ${r.benefit_type_color || CAMSA.gold}`,
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{ color: CAMSA.textPrimary }}>
                        {r.benefit_type_name}
                      </p>
                      <p className="text-xs" style={{ color: CAMSA.textDim }}>
                        {r.start_time?.slice(0, 5)} – {r.end_time?.slice(0, 5)}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        color: r.status === 'confirmed' ? '#63b3ed' : CAMSA.gold,
                        backgroundColor:
                          r.status === 'confirmed'
                            ? 'rgba(99,179,237,0.15)'
                            : CAMSA.goldGlow,
                      }}
                    >
                      {r.status === 'confirmed'
                        ? 'Confirmada'
                        : r.status === 'pending'
                        ? 'Pendiente'
                        : r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-4" style={{ color: CAMSA.textDim }}>
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
              style={{ borderColor: CAMSA.gold, borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
