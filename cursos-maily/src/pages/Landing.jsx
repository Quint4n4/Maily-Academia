import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui';
import logoMaily from '../../Logos/logomaily.png';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <header className="border-b border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoMaily}
              alt="Maily Academia"
              className="w-10 h-10 rounded-xl object-contain bg-white dark:bg-slate-900 shadow-sm"
            />
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-[0.18em] text-maily font-semibold">
                Plataforma de formación
              </p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Maily Academia
              </h1>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="outline" size="sm">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" icon={ArrowRight} iconPosition="right">
                Registrarme
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[3fr,2fr] items-center mb-14">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              Una sola plataforma,
              <span className="block text-maily mt-1">
                tres experiencias de aprendizaje.
              </span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl"
            >
              Capacitación en salud, software y formación corporativa en un mismo lugar.
              Accede con tus credenciales y continúa exactamente donde dejaste.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link to="/login">
                <Button size="lg" icon={ArrowRight} iconPosition="right">
                  Ir al acceso principal
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg">
                  Ya tengo cuenta
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 shadow-xl px-5 py-6 sm:px-7 sm:py-7"
          >
            <p className="text-xs font-semibold text-maily uppercase tracking-[0.22em] mb-2">
              Acceso único
            </p>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              Inicia sesión una vez,
              <span className="block text-slate-600 dark:text-slate-300">
                entra a la sección que te corresponde.
              </span>
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>• Credenciales públicas para Longevity 360.</li>
              <li>• Accesos especiales para Maily Academia.</li>
              <li>• Cuentas corporativas para CAMSA.</li>
            </ul>
          </motion.div>
        </section>

        {/* Secciones */}
        <section className="mb-14">
          <div className="mb-6">
            <p className="text-xs font-semibold text-maily uppercase tracking-[0.22em]">
              Secciones de la plataforma
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              Elige la experiencia que mejor te describe
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Maily Academia */}
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 p-5 flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-maily/10 text-maily">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Maily Academia
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Para usuarios del software Maily
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
                Acceso a cursos especializados para dominar el ecosistema Maily,
                con módulos prácticos y certificaciones internas.
              </p>
              <div className="mt-4">
                <Link to="/login">
                  <Button className="w-full" variant="outline" size="sm" icon={ArrowRight} iconPosition="right">
                    Ver más
                  </Button>
                </Link>
              </div>
            </motion.article>

            {/* Longevity 360 */}
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/60 dark:to-slate-950 p-5 flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Longevity 360
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-300">
                    Academia abierta de salud
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 flex-1">
                Registro libre para estudiantes y profesionales del área de salud.
                Cursos en línea, contenidos gratuitos y certificaciones pagadas.
              </p>
              <div className="mt-4">
                <Link to="/login">
                  <Button className="w-full" size="sm" icon={ArrowRight} iconPosition="right">
                    Explorar cursos
                  </Button>
                </Link>
              </div>
            </motion.article>

            {/* Corporativo CAMSA */}
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 p-5 flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-slate-900/5 dark:bg-slate-50/5 text-slate-900 dark:text-slate-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Corporativo CAMSA
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Acceso exclusivo corporativo
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">
                Programas internos de capacitación y desarrollo para colaboradores
                del corporativo CAMSA. El acceso es gestionado por el administrador.
              </p>
              <div className="mt-4">
                <Link to="/login">
                  <Button className="w-full" variant="outline" size="sm" icon={ArrowRight} iconPosition="right">
                    Acceso corporativo
                  </Button>
                </Link>
              </div>
            </motion.article>
          </div>
        </section>

        {/* CTA final */}
        <section className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-maily">
              Comienza ahora
            </p>
            <p className="mt-1 text-sm sm:text-base text-slate-700 dark:text-slate-200">
              Usa el mismo acceso para entrar a tus cursos en cualquier sección.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login">
              <Button size="sm" icon={ArrowRight} iconPosition="right">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Registrarme
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;

