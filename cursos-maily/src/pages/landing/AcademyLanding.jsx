import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSection } from '../../context/SectionContext';
import { LANDING_CONFIG } from './landingConfig';

// Map nav link labels to section IDs
const NAV_SECTION_MAP = {
  'Academia': 'hero',
  'Academy': 'hero',
  'Cursos': 'cursos',
  'Courses': 'cursos',
  'Beneficios': 'beneficios',
  'Benefits': 'beneficios',
  'Nosotros': 'footer',
  'About': 'footer',
  'Comunidad': 'beneficios',
  'Community': 'beneficios',
  'Programas': 'cursos',
  'Áreas': 'beneficios',
  'Contacto': 'footer',
};

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

// Stat card — white with colored text (visible on light bg)
const StatCard = ({ value, label, color }) => (
  <div className="bg-white border border-outline-variant/20 shadow-md p-8 rounded-2xl flex flex-col items-center text-center">
    <span className={`text-4xl font-black mb-2 tracking-tighter ${color}`}>{value}</span>
    <span className="uppercase tracking-widest text-xs font-bold text-secondary">{label}</span>
  </div>
);

// Benefit card
const BenefitCard = ({ icon, title, desc, accentColor }) => (
  <div className="bg-white p-8 rounded-2xl space-y-4 border border-outline-variant/20 hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
      <span className={`material-symbols-outlined ${accentColor || 'text-[#006780]'}`}>{icon}</span>
    </div>
    <h4 className="font-bold tracking-tight text-on-surface">{title}</h4>
    <p className="text-sm text-secondary leading-relaxed">{desc}</p>
  </div>
);

// Course card with real image
const CourseCard = ({ title, subtitle, image, loginHref, accentColor }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 group hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
    <div className="relative h-48 overflow-hidden">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
    <div className="p-6 space-y-3">
      <h3 className="text-lg font-bold tracking-tight text-on-surface leading-tight">{title}</h3>
      <p className="text-sm text-secondary">{subtitle}</p>
      <Link
        to={loginHref}
        className={`inline-flex items-center gap-1 text-sm font-bold ${accentColor} hover:underline`}
      >
        Ver curso
        <span className="material-symbols-outlined text-base">arrow_forward</span>
      </Link>
    </div>
  </div>
);

export default function AcademyLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { setCurrentSection } = useSection();

  const config = LANDING_CONFIG[slug];
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    if (!config) navigate('/', { replace: true });
  }, [config, navigate]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && config) {
      setCurrentSection(slug);
      const paths = {
        'longevity-360': '/longevity/dashboard',
        'maily-academia': '/maily/dashboard',
        'corporativo-camsa': '/corporativo/dashboard',
      };
      navigate(paths[slug] || '/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, config, slug, navigate, setCurrentSection]);

  if (isLoading || !config) return null;

  const loginHref = `/login?section=${slug}`;

  // Per-academy stat accent color
  const statColor = slug === 'longevity-360' ? 'text-[#006780]'
    : slug === 'maily-academia' ? 'text-[#845400]'
    : 'text-on-surface';

  return (
    <div className="font-plus-jakarta-sans bg-surface text-on-surface antialiased overflow-x-hidden min-h-screen">

      {/* ── Video Lightbox Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-16"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold text-xl">{selectedVideo.title}</h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-white/70 hover:text-white flex items-center gap-1 font-semibold text-sm"
                >
                  <span className="material-symbols-outlined">close</span> Cerrar
                </button>
              </div>
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                />
              </div>
              <p className="text-white/40 text-xs mt-3 text-center">Haz clic fuera del video para cerrar</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header id="hero" className="sticky top-0 z-50 bg-surface/90 backdrop-blur-xl shadow-sm">
        <nav className="flex justify-between items-center w-full px-8 py-3 max-w-7xl mx-auto">
          {/* Logo de la academia */}
          <Link to="/" className="flex items-center gap-3">
            {config.logo && (
              <div className={`h-10 flex items-center ${config.logoBg ? 'bg-black rounded-lg px-2' : ''}`}>
                <img src={config.logo} alt={config.name} className="h-8 w-auto object-contain" />
              </div>
            )}
            <span className="text-base font-bold tracking-tight text-on-surface hidden sm:block">{config.name}</span>
          </Link>

          {/* Nav links → scroll to section */}
          <div className="hidden md:flex items-center gap-8">
            {config.navLinks.map((link) => (
              <button
                key={link}
                onClick={() => scrollTo(NAV_SECTION_MAP[link] || 'hero')}
                className="text-on-surface-variant hover:text-on-surface text-sm font-semibold tracking-tight transition-colors"
              >
                {link}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to={loginHref} className="text-on-surface-variant font-semibold hover:text-primary text-sm transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link
              to={loginHref}
              className="px-6 py-2.5 rounded-full font-bold text-sm text-white hover:scale-105 active:scale-95 transition-all"
              style={{ background: `linear-gradient(135deg, ${slug === 'longevity-360' ? '#006780, #00b4d8' : '#845400, #ffb347'})` }}
            >
              Únete ahora
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section
          className={`relative min-h-[870px] flex items-center overflow-hidden bg-gradient-to-br ${config.heroGradient} text-white`}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 py-24">
            <motion.div
              initial={{ opacity: 0, x: -32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="lg:col-span-7 space-y-8"
            >
              <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-xs font-black tracking-widest uppercase">
                {config.tagline}
              </span>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tighter leading-[1.1]">
                {config.headline}{' '}
                <span className="text-primary-container">{config.headlineHighlight}</span>
              </h1>
              <p className="text-xl opacity-90 leading-relaxed max-w-2xl font-light">{config.subheadline}</p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to={loginHref} className="bg-white px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-transform active:scale-95 shadow-2xl text-on-surface">
                  Comienza ahora
                </Link>
                <button onClick={() => scrollTo('cursos')} className="border-2 border-white/30 text-white px-10 py-4 rounded-2xl font-bold hover:bg-white/10 transition-colors">
                  Ver cursos
                </button>
              </div>
            </motion.div>
            {/* Right – academy logo card */}
            <motion.div
              initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-5 relative hidden lg:flex justify-center items-center"
            >
              {config.heroVideo ? (
                // Branded video card (e.g. Corporativo CAMSA)
                <div
                  className="relative rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700 w-80 h-80"
                  style={{ border: '1px solid rgba(255,180,0,0.25)', backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.3)' }}
                >
                  <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: 'inset 0 0 60px rgba(255,180,0,0.08)' }} />
                  <video
                    src={config.heroVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover relative z-10"
                  />
                </div>
              ) : slug === 'corporativo-camsa' ? (
                // Fallback dark glass card
                <div className="relative rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700 w-80 h-80 flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,180,0,0.25)', backdropFilter: 'blur(12px)' }}>
                  <div className="absolute inset-0 rounded-3xl" style={{ boxShadow: 'inset 0 0 60px rgba(255,180,0,0.08)' }} />
                  <img src={config.logo} alt={config.name} className="w-4/5 h-4/5 object-contain relative z-10" />
                </div>
              ) : (
                // White card for light-bg academies
                <div className="rounded-3xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700 bg-white p-8 w-80 h-80 flex items-center justify-center">
                  <img src={config.logo} alt={config.name} className="w-full h-full object-contain" />
                </div>
              )}
            </motion.div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-8 -mt-10 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {config.stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.4 }}>
                <StatCard value={s.value} label={s.label} color={statColor} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Featured courses ──────────────────────────────────────── */}
        <section id="cursos" className="max-w-7xl mx-auto px-8 py-32">
          <div className="flex justify-between items-end mb-16">
            <div className="space-y-2">
              <span className={`font-bold tracking-[0.2em] uppercase text-xs ${statColor}`}>Excelencia Académica</span>
              <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">Cursos destacados</h2>
            </div>
            <Link to={loginHref} className={`font-bold flex items-center gap-2 hover:underline text-sm ${statColor}`}>
              Ver catálogo completo
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(config.courses || []).map((course, i) => (
              <motion.div
                key={course.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 * i }}
              >
                <CourseCard
                  title={course.title}
                  subtitle={course.subtitle}
                  image={course.image}
                  loginHref={loginHref}
                  accentColor={statColor}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Videos informativos (solo si la academia los tiene) ──── */}
        {config.videos?.length > 0 && (
          <section id="videos" className="py-24">
            <div className="max-w-7xl mx-auto px-8">
              <div className="text-center mb-16">
                <span className={`font-bold tracking-[0.2em] uppercase text-xs ${statColor}`}>Conoce más</span>
                <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mt-2">Videos informativos</h2>
                <p className="text-secondary mt-3 max-w-xl mx-auto">Descubre el ecosistema Maily antes de empezar tu formación.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {config.videos.map((v) => (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4 }}
                    className="rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10 bg-white hover:shadow-xl transition-shadow cursor-pointer group"
                    onClick={() => setSelectedVideo(v)}
                  >
                    {/* Static YouTube thumbnail — click to open modal */}
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <img
                        src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`}
                        alt={v.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined text-4xl text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-5 flex items-center gap-3">
                      <span className={`material-symbols-outlined ${statColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>smart_display</span>
                      <h3 className="font-bold text-on-surface tracking-tight">{v.title}</h3>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Benefits / Why ────────────────────────────────────────── */}
        <section id="beneficios" className="bg-surface-container py-32">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <span className={`font-bold tracking-[0.2em] uppercase text-xs ${statColor}`}>Propuesta de Valor</span>
                <h2 className="text-5xl font-extrabold tracking-tight text-on-surface leading-none">{config.whyTitle}</h2>
                <p className="text-lg text-secondary leading-relaxed max-w-lg">{config.whyDescription}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {config.benefits.map((b) => (
                    <BenefitCard key={b.title} {...b} accentColor={statColor} />
                  ))}
                </div>
              </div>
              {/* Quote card */}
              <div className="relative flex items-center justify-center">
                <div className={`rounded-3xl p-12 text-white max-w-sm w-full bg-gradient-to-br ${config.heroGradient} shadow-2xl`}>
                  <span className="material-symbols-outlined mb-4 block text-4xl opacity-60">format_quote</span>
                  <p className="font-medium italic text-lg leading-relaxed">"{config.quote}"</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ────────────────────────────────────────────── */}
        <section className="px-8 py-24">
          <div className={`max-w-7xl mx-auto rounded-3xl p-12 lg:p-20 text-center space-y-8 shadow-2xl overflow-hidden relative bg-gradient-to-r ${config.heroGradient}`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <h2 className="text-4xl lg:text-6xl font-extrabold tracking-tighter text-white relative z-10">
              {config.ctaHeadline}
            </h2>
            <div className="flex flex-col items-center gap-6 relative z-10">
              <Link to={loginHref} className="bg-white text-on-surface px-12 py-5 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-2xl">
                Crear cuenta gratis
              </Link>
              <p className="text-white/80 text-sm font-medium">
                ¿Ya tienes cuenta?{' '}
                <Link to={loginHref} className="underline font-bold text-white">Inicia sesión aquí</Link>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer id="footer" className="bg-surface-container-low rounded-t-3xl mt-4">
        <div className="w-full py-20 px-8 flex flex-col md:flex-row justify-between items-start max-w-7xl mx-auto gap-12">
          <div className="space-y-4 max-w-sm">
            {config.logo && (
              <div className={`inline-flex ${config.logoBg ? 'bg-black rounded-lg p-2' : ''}`}>
                <img src={config.logo} alt={config.name} className="h-10 w-auto object-contain" />
              </div>
            )}
            <div className="text-lg font-black uppercase tracking-widest text-on-surface">{config.name.toUpperCase()}</div>
            <p className="text-secondary text-sm tracking-wide leading-relaxed">{config.footerTagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h5 className={`font-bold text-sm uppercase tracking-widest ${statColor}`}>Recursos</h5>
              <ul className="space-y-2">
                <li><a href="#" className={`text-secondary hover:text-on-surface transition-colors text-sm`}>Privacidad</a></li>
                <li><a href="#" className={`text-secondary hover:text-on-surface transition-colors text-sm`}>Términos</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className={`font-bold text-sm uppercase tracking-widest ${statColor}`}>Comunidad</h5>
              <ul className="space-y-2">
                <li><a href="#" className="text-secondary hover:text-on-surface transition-colors text-sm">Soporte</a></li>
                <li><Link to="/" className="text-secondary hover:text-on-surface transition-colors text-sm">Inicio</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 py-8 border-t border-outline-variant/20">
          <p className="text-secondary text-xs tracking-wide text-center">© 2024 {config.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
