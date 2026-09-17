import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CAMSA } from '../../theme/camsaTheme';
import { BookOpen, User } from 'lucide-react';

// Portal del empleado de Corporativo CAMSA.
//
// Hasta el 2026-09-17 esta pantalla pedia sus datos a `/corporate/dashboard/` y
// mostraba proximas citas, solicitudes pendientes y notificaciones. Los
// beneficios corporativos se retiraron de la plataforma --se atienden en una app
// aparte-- asi que ya no hay nada que cargar: queda el saludo y los accesos a lo
// que si vive aqui, que son los cursos y el perfil del empleado.

export default function CorporativoDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const quickLinks = [
    {
      icon: BookOpen,
      label: 'Cursos',
      desc: 'Material de capacitación',
      path: '/corporativo/courses',
      color: '#63b3ed',
    },
    {
      icon: User,
      label: 'Mi Perfil',
      desc: 'Actualizar información',
      path: '/corporativo/profile',
      color: '#fbd38d',
    },
  ];

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

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-3 mb-8">
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
      </div>
    </div>
  );
}
