import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Phone, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logoMaily from '../../Logos/logomaily.png';
import logoLongevity from '../../Logos/Longevity360-03.png';
import { Button, Input } from '../components/ui';
import { COUNTRIES, STATES_BY_COUNTRY, getCities } from '../data/locations';

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
    confirmPassword: '',
    country: '',
    state: '',
    city: '',
    dateOfBirth: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState(null);
  const [openCountry, setOpenCountry] = useState(false);
  const [openState, setOpenState] = useState(false);
  const [openCity, setOpenCity] = useState(false);
  const countryRef = useRef(null);
  const stateRef = useRef(null);
  const cityRef = useRef(null);

  const { login, register, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (countryRef.current?.contains(e.target)) return;
      if (stateRef.current?.contains(e.target)) return;
      if (cityRef.current?.contains(e.target)) return;
      setOpenCountry(false);
      setOpenState(false);
      setOpenCity(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCountryId = COUNTRIES.find((c) => c.name === formData.country)?.id;
  const stateOptions = currentCountryId ? (STATES_BY_COUNTRY[currentCountryId] || []) : [];
  const cityOptions = currentCountryId && formData.state ? getCities(currentCountryId, formData.state) : [];
  const showStateOther = currentCountryId && stateOptions.length === 0;
  const showCityOther = (currentCountryId && formData.state && cityOptions.length === 0) || (currentCountryId && formData.state && formData.city && !cityOptions.includes(formData.city));

  const handleCountrySelect = (name) => {
    setFormData((prev) => ({ ...prev, country: name, state: '', city: '' }));
    setErrors((prev) => ({ ...prev, state: '', city: '' }));
    setOpenCountry(false);
  };
  const handleStateSelect = (name) => {
    setFormData((prev) => ({ ...prev, state: name, city: '' }));
    setErrors((prev) => ({ ...prev, city: '' }));
    setOpenState(false);
  };
  const handleCitySelect = (name) => {
    setFormData((prev) => ({ ...prev, city: name }));
    setErrors((prev) => ({ ...prev, city: '' }));
    setOpenCity(false);
  };

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

      const country = formData.country.trim();
      if (!country) newErrors.country = 'El país es requerido';

      if (formData.dateOfBirth) {
        const today = new Date();
        const dob = new Date(formData.dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
          newErrors.dateOfBirth = 'Fecha de nacimiento inválida';
        } else if (dob > today) {
          newErrors.dateOfBirth = 'La fecha de nacimiento no puede ser futura';
        }
      }
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

  const getSectionDashboardPath = (redirectSection) => {
    if (redirectSection === 'corporativo-camsa') return '/corporativo/dashboard';
    if (redirectSection === 'maily-academia') return '/maily/dashboard';
    // Para estudiantes sin sección explícita o con Longevity, usar Longevity 360
    if (redirectSection === 'longevity-360' || redirectSection == null) return '/longevity/dashboard';
    // Fallback defensivo: alias legacy
    return null;
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
        // Si tiene varias secciones, mostrar selector de sección (solo aplica a estudiantes con múltiples accesos)
        if (result.sections?.length > 1) {
          setTimeout(() => navigate('/choose-section', { state: { sections: result.sections }, replace: true }), 100);
          return;
        }
        // Una vez establecido el usuario, decidimos el dashboard según:
        // - Rol admin/instructor → rutas existentes
        // - Rol student → redirección por sección si viene desde backend
        setTimeout(() => {
          const basePath = getDashboardPath();
          if (basePath === '/dashboard') {
            const target = getSectionDashboardPath(result.redirectSection);
            navigate(target || '/dashboard', { replace: true });
          } else {
            navigate(basePath, { replace: true });
          }
        }, 100);
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
        country: formData.country,
        state: formData.state,
        city: formData.city,
        dateOfBirth: formData.dateOfBirth,
      });
      if (result.success) {
        setTimeout(() => navigate('/survey'), 100);
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
    } else if (name === 'dateOfBirth') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-maily/5 via-transparent to-transparent dark:from-maily/10 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full min-h-screen flex flex-col justify-center bg-white dark:bg-gray-800/95 backdrop-blur-sm shadow-xl border-0 border-gray-100 dark:border-gray-700 p-6 sm:p-12 md:p-16 overflow-y-auto"
      >
        <div className="w-full max-w-md mx-auto">
          {/* Logos + nombre */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
              <img src={logoMaily} alt="Maily Academia" className="h-12 w-auto object-contain drop-shadow-sm" />
              <span className="text-gray-300 dark:text-gray-600 text-xl">+</span>
              <img src={logoLongevity} alt="Longevity 360" className="h-12 w-auto object-contain drop-shadow-sm" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
              CORPORATIVO ACADEMY
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Una plataforma, todas tus formaciones
            </p>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isLogin ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
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
                  <div className="relative" ref={countryRef}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      País
                    </label>
                    <button
                      type="button"
                      onClick={() => { setOpenCountry((v) => !v); setOpenState(false); setOpenCity(false); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all text-left ${
                        errors.country ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      } bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-maily/50`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {formData.country ? (
                          <>
                            <span>{COUNTRIES.find((c) => c.name === formData.country)?.flag}</span>
                            <span>{formData.country}</span>
                          </>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Selecciona tu país</span>
                        )}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${openCountry ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {openCountry && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto"
                        >
                          {COUNTRIES.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleCountrySelect(c.name)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                                formData.country === c.name ? 'bg-maily/10 text-maily' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <span>{c.flag}</span>
                              <span>{c.name}</span>
                              {formData.country === c.name && <span className="ml-auto">✓</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {errors.country && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.country}</p>
                    )}
                  </div>
                  {(stateOptions.length > 0 || showStateOther) && (
                    <div>
                      {stateOptions.length > 0 ? (
                        <div className="relative" ref={stateRef}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado / Provincia
                          </label>
                          <button
                            type="button"
                            onClick={() => { setOpenState((v) => !v); setOpenCountry(false); setOpenCity(false); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-maily/50"
                          >
                            <span className="truncate">
                              {formData.state || 'Selecciona estado o provincia'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${openState ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {openState && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto"
                              >
                                {stateOptions.map((stateName) => (
                                  <button
                                    key={stateName}
                                    type="button"
                                    onClick={() => handleStateSelect(stateName)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                                      formData.state === stateName ? 'bg-maily/10 text-maily' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                  >
                                    <span>{formData.state === stateName ? '☑' : '☐'}</span>
                                    <span>{stateName}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          {errors.state && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.state}</p>
                          )}
                        </div>
                      ) : (
                        <Input
                          label="Estado / Provincia"
                          name="state"
                          placeholder="Tu estado o provincia"
                          value={formData.state}
                          onChange={handleInputChange}
                          error={errors.state}
                        />
                      )}
                    </div>
                  )}
                  {(cityOptions.length > 0 || (formData.state && (showCityOther || formData.city))) && (
                    <div>
                      {cityOptions.length > 0 ? (
                        <div className="relative" ref={cityRef}>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Ciudad
                          </label>
                          <button
                            type="button"
                            onClick={() => { setOpenCity((v) => !v); setOpenCountry(false); setOpenState(false); }}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:border-maily/50"
                          >
                            <span className="truncate">
                              {formData.city || 'Selecciona ciudad'}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${openCity ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {openCity && (
                              <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-48 overflow-y-auto"
                              >
                                {cityOptions.map((cityName) => (
                                  <button
                                    key={cityName}
                                    type="button"
                                    onClick={() => handleCitySelect(cityName)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                                      formData.city === cityName ? 'bg-maily/10 text-maily' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                  >
                                    <span>{formData.city === cityName ? '☑' : '☐'}</span>
                                    <span>{cityName}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Si tu ciudad no aparece, escríbela abajo.
                          </p>
                          <Input
                            label=""
                            name="city"
                            placeholder="O escribe tu ciudad"
                            value={cityOptions.includes(formData.city) ? '' : formData.city}
                            onChange={handleInputChange}
                            className="mt-2"
                            error={errors.city}
                          />
                        </div>
                      ) : (
                        <Input
                          label="Ciudad"
                          name="city"
                          placeholder="Tu ciudad"
                          value={formData.city}
                          onChange={handleInputChange}
                          error={errors.city}
                        />
                      )}
                    </div>
                  )}
                    <div>
                      <Input
                        label="Fecha de nacimiento"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        error={errors.dateOfBirth}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Solo se usa para adaptar mejor tu experiencia. No se comparte con otros usuarios.
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

          <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} Corporativo Academy
          </p>
        </div>
        </motion.div>
    </div>
  );
};

export default Auth;
