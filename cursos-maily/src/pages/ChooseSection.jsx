import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSection } from '../context/SectionContext';
import logoLongevity from '../../Logos/Longevity360-03.png';
import logoMaily from '../../Logos/logomaily.png';

const SECTION_CONFIG = {
  'longevity-360': {
    name: 'Longevity 360',
    path: '/longevity/dashboard',
    icon: Sparkles,
    logo: logoLongevity,
    description: 'Cursos públicos y contenido general',
  },
  'maily-academia': {
    name: 'Maily Academia',
    path: '/maily/dashboard',
    icon: GraduationCap,
    logo: logoMaily,
    description: 'Cursos del ecosistema Maily',
  },
  'corporativo-camsa': {
    name: 'Corporativo',
    path: '/corporativo/dashboard',
    icon: Building2,
    logo: null,
    description: 'Contenido para trabajadores del corporativo',
  },
};

export default function ChooseSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { setCurrentSection, userSections } = useSection();

  const sections = location.state?.sections ?? userSections?.map((s) => s.slug) ?? [];
  const choices = sections
    .filter((slug) => SECTION_CONFIG[slug])
    .map((slug) => ({ slug, ...SECTION_CONFIG[slug] }));

  const handleChoose = (slug, path) => {
    setCurrentSection(slug);
    navigate(path, { replace: true });
  };

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'student') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (choices.length <= 1) {
      const slug = choices[0]?.slug || 'longevity-360';
      const path = SECTION_CONFIG[slug]?.path || '/longevity/dashboard';
      setCurrentSection(slug);
      navigate(path, { replace: true });
    }
  }, [user?.role, choices.length, navigate]);

  if (user?.role !== 'student') return null;
  if (choices.length <= 1) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          ¿A qué sección quieres ir?
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Tienes acceso a varias áreas. Elige una para continuar.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
        {choices.map(({ slug, name, path, icon: Icon, logo, description }, i) => (
          <motion.button
            key={slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => handleChoose(slug, path)}
            className="flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-maily hover:bg-maily/5 dark:hover:bg-maily/10 transition-all text-left"
          >
            {logo ? (
              <img src={logo} alt={name} className="h-14 w-auto object-contain flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-maily/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-7 h-7 text-maily" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-lg text-gray-900 dark:text-white">{name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
