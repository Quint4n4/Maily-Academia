import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CAMSA } from '../../theme/camsaTheme';
import { useToast } from '../../context/ToastContext';
import corporateService from '../../services/corporateService';
import { ChevronLeft, ChevronRight, Clock, Calendar, CheckCircle } from 'lucide-react';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function CalendarGrid({ year, month, availability, selectedDate, onSelectDate, onPrevMonth, onNextMonth }) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const adjustedFirst = firstDay === 0 ? 6 : firstDay - 1; // Lunes=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = 0; i < adjustedFirst; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: CAMSA.bgCard }}>
      <div
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: CAMSA.border }}
      >
        <button onClick={onPrevMonth} className="p-1 rounded hover:opacity-70 transition-opacity">
          <ChevronLeft size={20} style={{ color: CAMSA.textMuted }} />
        </button>
        <h3 className="font-semibold" style={{ color: CAMSA.textPrimary }}>
          {MESES[month]} {year}
        </h3>
        <button onClick={onNextMonth} className="p-1 rounded hover:opacity-70 transition-opacity">
          <ChevronRight size={20} style={{ color: CAMSA.textMuted }} />
        </button>
      </div>
      <div className="p-4">
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
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = availability[dateStr];
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const isPast =
              new Date(year, month, day) <
              new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const isSelected = selectedDate === dateStr;
            const isAvailable = dayData?.available;

            return (
              <button
                key={day}
                disabled={isPast || !isAvailable}
                onClick={() => onSelectDate(dateStr)}
                className="aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: isSelected
                    ? CAMSA.gold
                    : isAvailable && !isPast
                    ? CAMSA.goldGlow
                    : 'transparent',
                  color: isSelected
                    ? '#000'
                    : isPast
                    ? CAMSA.textDim
                    : isAvailable
                    ? CAMSA.textPrimary
                    : CAMSA.textDim,
                  opacity: isPast ? 0.3 : 1,
                  cursor: isPast || !isAvailable ? 'not-allowed' : 'pointer',
                  border: isToday ? `1px solid ${CAMSA.goldBorder}` : undefined,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CorporativoBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [benefit, setBenefit] = useState(null);
  const [step, setStep] = useState('calendar'); // 'calendar' | 'success'

  useEffect(() => {
    const firstDay = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const lastDayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
      lastDay.getDate()
    ).padStart(2, '0')}`;
    setLoadingAvailability(true);
    corporateService
      .getBenefitAvailability(slug, firstDay, lastDayStr)
      .then((data) => {
        setBenefit(data.benefit);
        setAvailability(data.dates || {});
      })
      .catch(() => showToast('Error al cargar disponibilidad', 'error'))
      .finally(() => setLoadingAvailability(false));
  }, [slug, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const selectedDateData = selectedDate ? availability[selectedDate] : null;
  const availableSlots = selectedDateData?.slots?.filter((s) => s.available) || [];

  const handleConfirmBooking = async () => {
    if (!selectedDate || !selectedSlot) return;
    setBooking(true);
    try {
      await corporateService.createReservation({
        benefit_type_slug: slug,
        date: selectedDate,
        start_time: selectedSlot.start,
        notes,
      });
      setStep('success');
    } catch (err) {
      const errData = err?.response?.data;
      const msg =
        errData?.detail ||
        errData?.non_field_errors?.[0] ||
        Object.values(errData || {}).flat()[0] ||
        'Error al agendar la cita';
      showToast(String(msg), 'error');
    } finally {
      setBooking(false);
    }
  };

  if (step === 'success') {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CAMSA.bg }}
      >
        <div className="text-center max-w-sm px-4">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: CAMSA.gold }}>
            ¡Cita agendada!
          </h2>
          <p className="mb-6" style={{ color: CAMSA.textMuted }}>
            Tu cita para <strong>{benefit?.name}</strong> el {selectedDate} a las{' '}
            {selectedSlot?.start} ha sido registrada.
            {benefit?.requires_approval && ' Recibirás confirmación del administrador.'}
          </p>
          <button
            onClick={() => navigate('/corporativo/reservations')}
            className="px-6 py-2 rounded-lg font-semibold"
            style={{ backgroundColor: CAMSA.gold, color: '#000' }}
          >
            Ver mis citas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: CAMSA.bg }}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/corporativo/benefits')}
          className="flex items-center gap-1 mb-6 transition-opacity hover:opacity-70"
          style={{ color: CAMSA.textMuted }}
        >
          <ChevronLeft size={18} /> Volver a beneficios
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: CAMSA.gold }}>
            {benefit?.name || 'Agendar Cita'}
          </h1>
          {benefit?.description && (
            <p style={{ color: CAMSA.textMuted }}>{benefit.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendario */}
          <div>
            <h2 className="font-medium mb-3" style={{ color: CAMSA.textMuted }}>
              1. Selecciona una fecha
            </h2>
            {loadingAvailability ? (
              <div
                className="rounded-xl p-8 flex items-center justify-center"
                style={{ backgroundColor: CAMSA.bgCard }}
              >
                <div
                  className="w-8 h-8 border-4 rounded-full animate-spin"
                  style={{ borderColor: CAMSA.gold, borderTopColor: 'transparent' }}
                />
              </div>
            ) : (
              <CalendarGrid
                year={currentYear}
                month={currentMonth}
                availability={availability}
                selectedDate={selectedDate}
                onSelectDate={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            )}
          </div>

          {/* Slots de tiempo */}
          <div>
            <h2 className="font-medium mb-3" style={{ color: CAMSA.textMuted }}>
              2. Selecciona un horario
            </h2>
            {!selectedDate ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ backgroundColor: CAMSA.bgCard, color: CAMSA.textDim }}
              >
                <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecciona primero una fecha en el calendario</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ backgroundColor: CAMSA.bgCard, color: CAMSA.textDim }}
              >
                <Clock size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay horarios disponibles en esta fecha</p>
              </div>
            ) : (
              <div className="rounded-xl p-4" style={{ backgroundColor: CAMSA.bgCard }}>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {selectedDateData?.slots?.map((slot, i) => (
                    <button
                      key={i}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className="py-2 px-3 rounded-lg text-sm font-medium transition-all"
                      style={{
                        backgroundColor:
                          selectedSlot?.start === slot.start && slot.available
                            ? CAMSA.gold
                            : slot.available
                            ? CAMSA.goldGlow
                            : 'rgba(255,255,255,0.03)',
                        color:
                          selectedSlot?.start === slot.start && slot.available
                            ? '#000'
                            : slot.available
                            ? CAMSA.textPrimary
                            : CAMSA.textDim,
                        opacity: slot.available ? 1 : 0.4,
                        cursor: slot.available ? 'pointer' : 'not-allowed',
                        border: `1px solid ${
                          selectedSlot?.start === slot.start && slot.available
                            ? CAMSA.gold
                            : CAMSA.border
                        }`,
                      }}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>

                {selectedSlot && (
                  <div className="space-y-3">
                    <div
                      className="p-3 rounded-lg text-sm"
                      style={{ backgroundColor: CAMSA.goldGlow }}
                    >
                      <p style={{ color: CAMSA.gold }}>
                        📅 {selectedDate} a las {selectedSlot.start} – {selectedSlot.end}
                      </p>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas para el administrador (opcional)"
                      rows={2}
                      className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none border"
                      style={{
                        backgroundColor: CAMSA.bgSurface,
                        borderColor: CAMSA.border,
                        color: CAMSA.textPrimary,
                      }}
                    />
                    <button
                      onClick={handleConfirmBooking}
                      disabled={booking}
                      className="w-full py-2.5 rounded-lg font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: CAMSA.gold, color: '#000' }}
                    >
                      {booking ? 'Agendando...' : 'Confirmar cita'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
