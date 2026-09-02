import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CAMSA } from '../../theme/camsaTheme';
import { useToast } from '../../context/ToastContext';
import corporateService from '../../services/corporateService';
import { BookOpen, Calendar, Gift, User, AlertCircle, ChevronRight, Clock } from 'lucide-react';

export default function CorporativoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    corporateService
      .getCorporateDashboardData()
      .then(setDashData)
      .catch(() => {
        // Si no hay datos (ej: primer login), no es error crítico
        setDashData({
          profile_complete: false,
          upcoming_reservations: [],
          pending_requests_count: 0,
          unread_notifications: 0,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    {
      icon: BookOpen,
      label: 'Cursos',
      desc: 'Material de capacitación',
      path: '/corporativo/courses',
      color: '#63b3ed',
    },
    {
      icon: Gift,
      label: 'Beneficios',
      desc: 'Explora tus beneficios',
      path: '/corporativo/benefits',
      color: CAMSA.gold,
    },
    {
      icon: Calendar,
      label: 'Agendar Cita',
      desc: 'Reserva un servicio',
      path: '/corporativo/benefits',
      color: '#9ae6b4',
    },
    {
      icon: User,
      label: 'Mi Perfil',
      desc: 'Actualizar información',
      path: '/corporativo/profile',
      color: '#fbd38d',
    },
  ];

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: CAMSA.bg }}
      >
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
        {/* Saludo */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: CAMSA.gold }}>
            Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p style={{ color: CAMSA.textMuted }}>
            Portal de empleados — Corporativo CAMSA
          </p>
        </div>

        {/* Alerta: perfil incompleto */}
        {dashData && !dashData.profile_complete && (
          <div
            className="flex items-start gap-3 p-4 rounded-xl mb-6 border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: CAMSA.goldGlow, borderColor: CAMSA.goldBorder }}
            onClick={() => navigate('/corporativo/profile')}
          >
            <AlertCircle
              size={20}
              style={{ color: CAMSA.gold, flexShrink: 0, marginTop: 2 }}
            />
            <div className="flex-1">
              <p className="font-medium" style={{ color: CAMSA.gold }}>
                Completa tu perfil
              </p>
              <p className="text-sm" style={{ color: CAMSA.textMuted }}>
                Necesitas foto, departamento y puesto para acceder a los beneficios
                corporativos.
              </p>
            </div>
            <ChevronRight size={18} style={{ color: CAMSA.textDim }} />
          </div>
        )}

        {/* Stats rápidas */}
        {dashData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: CAMSA.bgCard }}
            >
              <p className="text-2xl font-bold" style={{ color: CAMSA.gold }}>
                {dashData.upcoming_reservations?.length || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: CAMSA.textMuted }}>
                Próximas citas
              </p>
            </div>
            <div
              className="rounded-xl p-4 text-center"
              style={{ backgroundColor: CAMSA.bgCard }}
            >
              <p className="text-2xl font-bold" style={{ color: '#fbd38d' }}>
                {dashData.pending_requests_count || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: CAMSA.textMuted }}>
                Solicitudes pendientes
              </p>
            </div>
            <div
              className="rounded-xl p-4 text-center col-span-2 sm:col-span-1"
              style={{ backgroundColor: CAMSA.bgCard }}
            >
              <p className="text-2xl font-bold" style={{ color: '#fc8181' }}>
                {dashData.unread_notifications || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: CAMSA.textMuted }}>
                Notificaciones nuevas
              </p>
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {quickLinks.map((link) => (
            <button
              key={link.path + link.label}
              onClick={() => navigate(link.path)}
              className="rounded-xl p-4 text-left flex flex-col gap-2 transition-all hover:scale-[1.02] border"
              style={{ backgroundColor: CAMSA.bgCard, borderColor: CAMSA.border }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${link.color}22` }}
              >
                <link.icon size={18} style={{ color: link.color }} />
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: CAMSA.textPrimary }}>
                  {link.label}
                </p>
                <p className="text-xs" style={{ color: CAMSA.textDim }}>
                  {link.desc}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Próximas citas */}
        {dashData?.upcoming_reservations?.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: CAMSA.bgCard }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: CAMSA.border }}
            >
              <h2 className="font-semibold" style={{ color: CAMSA.gold }}>
                Próximas Citas
              </h2>
              <button
                onClick={() => navigate('/corporativo/reservations')}
                className="text-xs flex items-center gap-1 hover:opacity-70"
                style={{ color: CAMSA.textMuted }}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            <div className="divide-y" style={{ borderColor: CAMSA.border }}>
              {dashData.upcoming_reservations.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: r.benefit_type_color || CAMSA.gold }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: CAMSA.textPrimary }}
                    >
                      {r.benefit_type_name}
                    </p>
                    <p
                      className="text-xs flex items-center gap-1"
                      style={{ color: CAMSA.textDim }}
                    >
                      <Calendar size={11} />
                      {r.date}
                      <Clock size={11} className="ml-1" />
                      {r.start_time?.slice(0, 5)}
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
                    {r.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
