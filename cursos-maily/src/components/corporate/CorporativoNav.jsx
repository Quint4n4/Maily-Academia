import { NavLink } from 'react-router-dom';
import { Home, BookOpen, Gift, Calendar, User } from 'lucide-react';
import { CAMSA } from '../../theme/camsaTheme';

const NAV_ITEMS = [
  { to: '/corporativo/dashboard', label: 'Inicio', icon: Home },
  { to: '/corporativo/courses', label: 'Cursos', icon: BookOpen },
  { to: '/corporativo/benefits', label: 'Beneficios', icon: Gift },
  { to: '/corporativo/reservations', label: 'Mis Citas', icon: Calendar },
  { to: '/corporativo/profile', label: 'Mi Perfil', icon: User },
];

export default function CorporativoNav() {
  return (
    <nav
      className="sticky top-16 z-40 border-b overflow-x-auto"
      style={{ backgroundColor: CAMSA.bgSurface, borderColor: CAMSA.border }}
    >
      <div className="max-w-4xl mx-auto px-4 flex">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive ? '' : 'hover:opacity-70 border-transparent'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? CAMSA.gold : CAMSA.textMuted,
              borderBottomColor: isActive ? CAMSA.gold : 'transparent',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
