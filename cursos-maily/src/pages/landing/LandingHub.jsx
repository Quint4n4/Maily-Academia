import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import logoLongevity from '../../../Logos/Longevity360-03.png';
import logoMaily from '../../../Logos/logomaily.png';
import logoCorporativo from '../../../Logos/logocorporativo.png';
import logoCamsa from '../../../Logos/camsa_final.png';

const ACADEMIES = [
  {
    slug: 'longevity-360',
    name: 'Longevity 360',
    logo: logoLongevity,
    logoBg: 'white',
    icon: 'monitor_heart',
    description: 'Cursos de bienestar, salud y longevidad diseñados por expertos para una vida plena y saludable.',
    gradient: 'from-[#006780] to-[#00b4d8]',
    buttonText: 'Explorar Longevity 360',
    buttonTextColor: 'text-[#006780]',
  },
  {
    slug: 'maily-academia',
    name: 'Maily Academia',
    logo: logoMaily,
    logoBg: false,
    icon: 'rocket_launch',
    iconFill: true,
    description: 'Domina el ecosistema Maily: formación avanzada en tecnología, negocios y emprendimiento digital.',
    gradient: 'from-[#845400] to-[#ffb347]',
    buttonText: 'Explorar Maily Academia',
    buttonTextColor: 'text-[#845400]',
  },
  {
    slug: 'corporativo-camsa',
    name: 'Corporativo CAMSA',
    logo: logoCorporativo,
    logoBg: true,
    icon: 'corporate_fare',
    description: 'Programas de capacitación técnica y soft skills exclusivos para colaboradores del corporativo.',
    gradient: 'from-[#1b1c19] to-[#30312e]',
    buttonText: 'Explorar Corporativo',
    buttonTextColor: 'text-[#1b1c19]',
    buttonStyle: 'bg-white/10 backdrop-blur-md text-white border border-white/30 hover:bg-white hover:text-on-surface',
  },
];

const STATS = [
  { value: '15+', label: 'Cursos', color: 'text-primary' },
  { value: '500+', label: 'Alumnos', color: 'text-[#006780]' },
  { value: '20+', label: 'Instructores', color: 'text-primary' },
  { value: '3', label: 'Academias', color: 'text-[#006780]' },
];

const FEATURES = [
  {
    icon: 'schedule',
    iconBg: 'bg-[#b8eaff]',
    iconColor: 'text-[#006780]',
    title: 'Aprende a tu ritmo',
    desc: 'Acceso ilimitado 24/7 a todo nuestro contenido. Tú decides cuándo y dónde estudiar.',
  },
  {
    icon: 'workspace_premium',
    iconBg: 'bg-[#ffddb6]',
    iconColor: 'text-[#845400]',
    title: 'Certificados oficiales',
    desc: 'Avalamos tu aprendizaje con certificaciones reconocidas en el sector corporativo.',
  },
  {
    icon: 'groups',
    iconBg: 'bg-[#e5e2e1]',
    iconColor: 'text-[#1b1c19]',
    title: 'Comunidad activa',
    desc: 'Forma parte de una red de estudiantes y profesionales con tus mismos intereses.',
  },
];

export default function LandingHub() {
  const { isAuthenticated, isLoading, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, getDashboardPath]);

  if (isLoading) return null;

  return (
    <div className="font-plus-jakarta-sans bg-surface text-on-surface antialiased overflow-x-hidden min-h-screen">

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(27,28,25,0.06)]">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-20">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tighter text-on-surface">Camsa World Academy</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {ACADEMIES.map((a) => (
              <Link
                key={a.slug}
                to={`/academia/${a.slug}`}
                className="text-on-surface-variant hover:text-on-surface text-sm font-semibold tracking-tight transition-colors"
              >
                {a.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden lg:block text-on-surface-variant font-semibold hover:text-primary transition-colors text-sm">
              Iniciar sesión
            </Link>
            <Link
              to="/login"
              className="px-7 py-3 rounded-full font-bold text-sm text-white shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #845400 0%, #ffb347 100%)' }}
            >
              Comienza ahora
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-20">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative min-h-[870px] flex items-center overflow-hidden px-6"
          style={{ background: 'linear-gradient(135deg, #006780 0%, #00b4d8 55%, #ffb347 100%)' }}>
          {/* Decorative blobs */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-[#845400] rounded-full blur-[120px] mix-blend-overlay" />
            <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-[#b8eaff] rounded-full blur-2xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-24">

            {/* Left — Logo card */}
            <motion.div
              initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="flex justify-center"
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ width: 480, height: 480 }}>
                <img src={logoCamsa} alt="Camsa World Academy" className="w-full h-full object-contain" style={{ transform: 'scale(1.6)' }} />
              </div>
            </motion.div>

            {/* Right — Headline + CTA */}
            <div className="flex flex-col gap-8">
              <motion.span
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-block w-fit py-2 px-5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-[0.7rem] font-black tracking-[0.25em] rounded-full uppercase"
              >
                Plataforma Educativa
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl font-extrabold text-white tracking-tighter leading-[1.1]"
              >
                Tu camino hacia el conocimiento empieza aquí
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                className="text-xl text-white/90 font-light leading-relaxed"
              >
                Transformando vidas profesionales y personales a través de una experiencia educativa curada y de alto nivel.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              >
                <a href="#academias"
                  className="inline-block bg-white text-on-surface px-10 py-5 rounded-full font-bold text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all">
                  Explorar academias
                </a>
              </motion.div>
            </div>

          </div>
        </section>

        {/* ── Stats Bar ───────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-8 -mt-12 relative z-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-0 bg-white p-8 rounded-2xl shadow-[0_40px_40px_-10px_rgba(27,28,25,0.08)] border border-outline-variant/10"
          >
            {STATS.map((s, i) => (
              <div key={s.label} className={`text-center ${i > 0 ? 'border-l border-outline-variant/20' : ''}`}>
                <div className={`text-3xl font-extrabold tracking-tighter ${s.color}`}>{s.value}</div>
                <div className="text-xs font-black uppercase tracking-widest text-secondary mt-1">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ── Academies Bento ─────────────────────────────────────────── */}
        <section id="academias" className="max-w-7xl mx-auto px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-4">Nuestras Academias</h2>
            <p className="text-lg text-secondary max-w-2xl mx-auto">Selecciona el ecosistema que mejor se adapte a tus metas de crecimiento.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {ACADEMIES.map((academy, i) => (
              <motion.div
                key={academy.slug}
                initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 * i }}
                className={`group relative bg-gradient-to-br ${academy.gradient} p-10 rounded-2xl overflow-hidden flex flex-col justify-between min-h-[480px] hover:shadow-2xl transition-all duration-500`}
              >
                <div className="relative z-10">
                  <div className={`w-36 h-24 mx-auto flex items-center justify-center mb-8 rounded-2xl p-3 ${
                    academy.logoBg === 'white' ? 'bg-white shadow-md' :
                    academy.logoBg === true  ? 'bg-black' : ''
                  }`}>
                    <img
                      src={academy.logo}
                      alt={academy.name}
                      className="max-h-full max-w-full object-contain drop-shadow-sm"
                    />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">{academy.name}</h3>
                  <p className="text-white/80 text-lg leading-relaxed mb-8">{academy.description}</p>
                </div>
                <Link
                  to={`/academia/${academy.slug}`}
                  className={`relative z-10 w-fit px-8 py-4 rounded-full font-bold transition-colors ${
                    academy.buttonStyle || `bg-white ${academy.buttonTextColor} hover:opacity-90`
                  }`}
                >
                  {academy.buttonText}
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section className="bg-surface-container py-24">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
              {FEATURES.map((f) => (
                <div key={f.title} className="text-center px-4">
                  <div className={`mb-6 inline-flex p-4 ${f.iconBg} rounded-full ${f.iconColor}`}>
                    <span className="material-symbols-outlined text-4xl">{f.icon}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-4">{f.title}</h4>
                  <p className="text-secondary leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="py-24 px-8">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl p-12 shadow-sm border border-outline-variant/20 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex-1 text-left">
              <h2 className="text-3xl font-extrabold tracking-tight mb-4">¿Listo para comenzar?</h2>
              <p className="text-secondary text-lg">Únete a los alumnos que ya transforman su futuro con Camsa World Academy.</p>
            </div>
            <Link
              to="/login"
              className="flex-shrink-0 px-12 py-5 rounded-full font-bold text-lg text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #845400 0%, #ffb347 100%)' }}
            >
              Crear mi cuenta gratis
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="w-full py-16 border-t border-outline-variant/20 bg-surface-container-low">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2">
            <div className="text-xl font-bold text-on-surface">Camsa World Academy</div>
            <p className="text-sm text-secondary">© 2024 Camsa World Academy. The Curated Canvas of Education.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a href="#" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Privacidad</a>
            <a href="#" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Términos</a>
            <a href="#" className="text-secondary hover:text-primary transition-colors text-sm font-medium">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
