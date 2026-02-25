import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Heart, BookOpen, Award, Sparkles, Phone, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoMaily from '../../Logos/logomaily.png';
import { Button, Input } from '../components/ui';

// Validation constants (align with backend)
const PASSWORD_MIN_LENGTH = 10;
const NAME_MIN_LENGTH = 2;
/** Solo letras y espacios (nombres compuestos). Sin números ni símbolos. */
const NAME_ONLY_LETTERS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
const PHONE_PATTERN = /^[0-9]{10}$/;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(null);

  const { login, register, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  // Generar username automáticamente desde nombre y apellido
  const generatedUsername = useMemo(() => {
    const fn = formData.firstName.trim().toLowerCase();
    const ln = formData.lastName.trim().toLowerCase();
    if (fn && ln) {
      const base = `${fn}_${ln}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_]/g, '')
        .substring(0, 30);
      return base;
    }
    return '';
  }, [formData.firstName, formData.lastName]);

  const validateForm = () => {
    const newErrors = {};
    if (!isLogin) {
      const fn = formData.firstName.trim();
      if (!fn) newErrors.firstName = 'El nombre es requerido';
      else if (fn.length < NAME_MIN_LENGTH) newErrors.firstName = `El nombre debe tener al menos ${NAME_MIN_LENGTH} caracteres`;
      else if (!NAME_ONLY_LETTERS.test(fn)) newErrors.firstName = 'El nombre solo puede contener letras';

      const ln = formData.lastName.trim();
      if (!ln) newErrors.lastName = 'El apellido es requerido';
      else if (ln.length < NAME_MIN_LENGTH) newErrors.lastName = `El apellido debe tener al menos ${NAME_MIN_LENGTH} caracteres`;
      else if (!NAME_ONLY_LETTERS.test(ln)) newErrors.lastName = 'El apellido solo puede contener letras';

      const phone = formData.phone.trim();
      if (!phone) newErrors.phone = 'El teléfono es requerido';
      else if (!PHONE_PATTERN.test(phone)) newErrors.phone = 'El teléfono debe tener exactamente 10 dígitos';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Correo inválido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (!isLogin) {
      // Solo validar complejidad de contraseña en REGISTRO, no en login
      if (formData.password.length < PASSWORD_MIN_LENGTH) {
        newErrors.password = `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
      } else if (!PASSWORD_HAS_UPPER.test(formData.password)) {
        newErrors.password = 'Debe contener al menos una mayúscula';
      } else if (!PASSWORD_HAS_LOWER.test(formData.password)) {
        newErrors.password = 'Debe contener al menos una minúscula';
      } else if (!PASSWORD_HAS_DIGIT.test(formData.password)) {
        newErrors.password = 'Debe contener al menos un número';
      } else if (!PASSWORD_HAS_SPECIAL.test(formData.password)) {
        newErrors.password = 'Debe contener al menos un carácter especial (!@#$%^&* etc.)';
      }
    }
    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setIsAccountLocked(false);
    setLockoutInfo(null);
    if (!validateForm()) return;
    setIsLoading(true);

    if (isLogin) {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        // getDashboardPath needs the user to be set, so small delay
        setTimeout(() => navigate(getDashboardPath()), 100);
      } else if (result.isLocked) {
        setIsAccountLocked(true);
        setLockoutInfo({
          lockedUntil: result.lockedUntil,
          remainingMinutes: result.remainingMinutes,
        });
        setGeneralError(result.error);
      } else {
        setGeneralError(result.error);
      }
    } else {
      const result = await register({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        password: formData.password,
        passwordConfirm: formData.confirmPassword,
      });
      if (result.success) {
        setTimeout(() => navigate(getDashboardPath()), 100);
      } else {
        setGeneralError(result.error);
      }
    }
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Solo permitir números en el campo de teléfono, máximo 10 dígitos
    if (name === 'phone') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const features = [
    { icon: BookOpen, text: 'Cursos interactivos', color: 'text-blue-500' },
    { icon: Award, text: 'Certificados oficiales', color: 'text-yellow-500' },
    { icon: Sparkles, text: 'Contenido actualizado', color: 'text-purple-500' },
    { icon: Heart, text: 'Soporte continuo', color: 'text-red-500' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 p-12 relative overflow-hidden">
        <div className="absolute top-20 left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between h-full text-white">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3">
              <img src={logoMaily} alt="Maily Academia" className="w-12 h-12 rounded-xl object-contain bg-white/20 backdrop-blur-sm" />
              <div>
                <h1 className="text-2xl font-bold">Maily Academia</h1>
                <p className="text-white/70 text-sm">Plataforma de cursos</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Aprende a dominar<br />el software que<br />
              <span className="text-orange-400">transforma tu trabajo</span>
            </h2>
            <p className="text-white/80 text-lg max-w-md">
              Cursos diseñados para que aprendas a tu ritmo con seguimiento personalizado y certificaciones.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              {features.map((feature, index) => (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-white/60 text-sm">
            &copy; 2024 Maily Academia. Todos los derechos reservados.
          </motion.div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src={logoMaily} alt="Maily Academia" className="w-10 h-10 rounded-xl object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Maily Academia</h1>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Plataforma de cursos</p>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {isLogin ? 'Ingresa tus credenciales para continuar' : 'Comienza tu viaje de aprendizaje'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-8">
            <button onClick={() => setIsLogin(true)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Iniciar sesión
            </button>
            <button onClick={() => setIsLogin(false)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
              Registrarse
            </button>
          </div>

          <AnimatePresence>
            {generalError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className={`mb-4 p-4 rounded-xl text-sm ${
                  isAccountLocked 
                    ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}
              >
                {isAccountLocked ? (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-700 dark:text-orange-400">Cuenta bloqueada temporalmente</p>
                      <p className="text-orange-600 dark:text-orange-300 mt-1">{generalError}</p>
                      {lockoutInfo?.remainingMinutes > 0 && (
                        <p className="text-orange-500 dark:text-orange-400 mt-2 text-xs">
                          Puedes intentar de nuevo en {lockoutInfo.remainingMinutes} minuto{lockoutInfo.remainingMinutes !== 1 ? 's' : ''}, 
                          o contactar al administrador para desbloquear tu cuenta.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-600 dark:text-red-400">{generalError}</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="register-fields" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Nombre" name="firstName" placeholder="Tu nombre" icon={User} value={formData.firstName} onChange={handleInputChange} error={errors.firstName} />
                    <Input label="Apellido" name="lastName" placeholder="Tu apellido" value={formData.lastName} onChange={handleInputChange} error={errors.lastName} />
                  </div>
                  <div>
                    <Input 
                      label="Número de teléfono" 
                      name="phone" 
                      type="tel"
                      placeholder="987654321" 
                      icon={Phone} 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      error={errors.phone} 
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Solo números, exactamente 10 dígitos.
                    </p>
                  </div>
                  {generatedUsername && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nombre de usuario (generado automáticamente)
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">@</span>
                        <span className="text-gray-700 dark:text-gray-300">{generatedUsername}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <Input label="Correo electrónico" name="email" type="email" placeholder="tu@correo.com" icon={Mail} value={formData.email} onChange={handleInputChange} error={errors.email} />
            <div>
              <Input label="Contraseña" name="password" type="password" placeholder="••••••••" icon={Lock} value={formData.password} onChange={handleInputChange} error={errors.password} />
              {!isLogin && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  Mín. {PASSWORD_MIN_LENGTH} caracteres, una mayúscula, una minúscula, un número y un carácter especial.
                </p>
              )}
              {isLogin && (
                <div className="mt-2 text-right">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="confirmPassword" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Input label="Confirmar contraseña" name="confirmPassword" type="password" placeholder="••••••••" icon={Lock} value={formData.confirmPassword} onChange={handleInputChange} error={errors.confirmPassword} />
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full" size="lg" loading={isLoading} icon={ArrowRight} iconPosition="right">
              {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
