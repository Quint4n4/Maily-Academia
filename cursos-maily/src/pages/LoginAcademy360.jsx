import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { hayGoogle, useBotonDeGoogle, useEntrar } from '../hooks/useEntrar';
import { MARCA } from './landing/academy360Config';
import { Foto } from './landing/secciones/Piezas';

/**
 * Entrada a Academy360.
 *
 * Solo login: el registro vive en su propia pantalla, como pide el diseño.
 *
 * Lo que NO cambia respecto a la pantalla anterior, porque está en producción y
 * no se toca al rediseñar: a dónde va cada quien después de entrar, el botón
 * oficial de Google, y el aviso de cuenta bloqueada con los minutos que
 * faltan. Todo eso vive en `hooks/useEntrar.js`.
 */

const FOTO = { src: '/landing/login.jpg', min: '1440 × 1800' };

const LoginAcademy360 = () => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [bloqueada, setBloqueada] = useState(false);
  const [minutos, setMinutos] = useState(null);

  const { login, loginConGoogle } = useAuth();
  const { irAlDestino } = useEntrar();
  const navigate = useNavigate();

  const fallo = (resultado) => {
    setError(resultado.error || 'No pudimos iniciar sesión.');
    // El backend avisa de la cuenta bloqueada con los minutos que faltan; sin
    // enseñarlos, el usuario reintenta a ciegas y alarga su propio bloqueo.
    const restantes = resultado.remainingMinutes;
    setBloqueada(Boolean(resultado.isLocked));
    setMinutos(restantes ?? null);
  };

  const entrar = async (evento) => {
    evento.preventDefault();
    setError('');
    setBloqueada(false);
    setCargando(true);
    try {
      const resultado = await login(correo, contrasena);
      if (resultado.success) irAlDestino(resultado);
      else fallo(resultado);
    } finally {
      setCargando(false);
    }
  };

  const contenedorDeGoogle = useBotonDeGoogle(async (respuesta) => {
    setError('');
    setBloqueada(false);
    setCargando(true);
    try {
      const resultado = await loginConGoogle(respuesta?.credential);
      if (resultado.success) irAlDestino(resultado, resultado.created);
      else fallo(resultado);
    } finally {
      setCargando(false);
    }
  });

  const etiqueta = 'block font-ui text-a-13 text-academy-tinta-2 dark:text-white/70';
  const campo =
    'h-[52px] w-full rounded-[4px] border border-academy-borde bg-white px-4 font-ui text-a-15 '
    + 'text-academy-tinta placeholder:text-academy-tinta-3/70 transition-[border-color,box-shadow] '
    + 'duration-150 focus:border-academy-oro-texto focus:outline-none focus:ring-1 '
    + 'focus:ring-academy-oro-texto dark:bg-white/5 dark:text-academy-crema dark:border-white/20';

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Foto: en móvil no se pinta, para que el formulario quede a la vista
          sin tener que bajar. */}
      <div className="relative hidden bg-academy-crema-2 lg:block dark:bg-white/5">
        <Foto src={FOTO.src} alt="" min={FOTO.min} etiqueta="Foto del login" className="h-full w-full" />
        <figure className="absolute bottom-[72px] left-[72px] max-w-[420px] bg-white/95 px-8 py-7 dark:bg-academy-tinta/95">
          <p className="font-display text-a-28 italic leading-[1.3] text-academy-tinta dark:text-academy-crema">
            Aprende salud con quienes la ejercen.
          </p>
        </figure>
      </div>

      <div className="flex flex-col justify-between bg-white px-6 py-8 sm:px-10 lg:px-[88px] dark:bg-academy-tinta">
        <Link
          to="/"
          className="inline-flex items-center gap-2 self-start font-ui text-a-13 text-academy-tinta-3 hover:text-academy-tinta dark:text-white/50 dark:hover:text-white"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </Link>

        <div className="mx-auto w-full max-w-[400px] py-10">
          <img src={MARCA.logo} alt={MARCA.nombre} className="mx-auto h-[104px] w-[104px]" />

          <h1 className="mt-6 text-center font-display text-a-44 text-academy-tinta dark:text-academy-crema">
            Inicia sesión
          </h1>
          <p className="mt-2 text-center font-ui text-a-15 text-academy-tinta-3 dark:text-white/60">
            Entra para continuar con tus cursos.
          </p>

          {error && (
            <div
              role="alert"
              className={`mt-6 flex items-start gap-3 rounded-[4px] px-4 py-3 font-ui text-a-13 ${
                bloqueada
                  ? 'bg-academy-oro/15 text-academy-sobre-oro dark:text-academy-crema'
                  : 'bg-academy-error/10 text-academy-error'
              }`}
            >
              {bloqueada && <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
              <div>
                <p>{error}</p>
                {minutos > 0 && (
                  <p className="mt-1 opacity-80">Puedes intentar de nuevo en {minutos} minuto(s).</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={entrar} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="correo" className={etiqueta}>Correo electrónico</label>
              <input
                id="correo" name="email" type="email" autoComplete="email" required
                value={correo} onChange={(e) => setCorreo(e.target.value)}
                placeholder="tu@correo.com" className={campo}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="contrasena" className={etiqueta}>Contraseña</label>
              <div className="relative">
                <input
                  id="contrasena" name="password" autoComplete="current-password" required
                  type={verContrasena ? 'text' : 'password'}
                  value={contrasena} onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••" className={`${campo} pr-24`}
                />
                {/* Botón de texto y no un icono: es lo que pide el diseño, y
                    "Mostrar" se entiende sin conocer la convención del ojo. */}
                <button
                  type="button"
                  onClick={() => setVerContrasena((v) => !v)}
                  aria-pressed={verContrasena}
                  aria-controls="contrasena"
                  className="absolute right-3 top-1/2 flex h-11 -translate-y-1/2 items-center px-2 font-ui text-a-13 text-academy-oro-texto hover:underline dark:text-academy-oro"
                >
                  {verContrasena ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="font-ui text-a-13 text-academy-oro-texto hover:underline dark:text-academy-oro"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[4px] bg-academy-oro font-ui text-a-15 tracking-[0.04em] text-academy-sobre-oro transition-[filter] duration-200 hover:brightness-95 disabled:opacity-60"
            >
              {cargando ? <Loader2 size={18} className="animate-spin" /> : 'Entrar'}
            </button>
          </form>

          {hayGoogle && (
            <>
              <div className="relative my-8 text-center">
                <span className="absolute inset-0 flex items-center" aria-hidden="true">
                  <span className="w-full border-t border-academy-linea-2 dark:border-white/10" />
                </span>
                <span className="relative bg-white px-4 font-ui text-[11px] uppercase tracking-[0.18em] text-academy-tinta-3 dark:bg-academy-tinta dark:text-white/50">
                  o inicia sesión con
                </span>
              </div>
              <div className="flex min-h-[44px] justify-center" ref={contenedorDeGoogle} />
            </>
          )}

          <p className="mt-8 text-center font-ui text-a-13 text-academy-tinta-3 dark:text-white/60">
            ¿Aún no tienes cuenta?{' '}
            {/* Lleva a la pantalla actual, que trae el formulario completo con
                sus nueve campos. Rehacerlo entra en su propia tarea. */}
            <button
              type="button"
              onClick={() => navigate('/registro')}
              className="font-medium text-academy-oro-texto hover:underline dark:text-academy-oro"
            >
              Crea una gratis
            </button>
          </p>
        </div>

        <p className="text-center font-ui text-[11px] text-academy-tinta-3/70 dark:text-white/40">
          © {MARCA.anio} {MARCA.nombre}
        </p>
      </div>
    </main>
  );
};

export default LoginAcademy360;
