import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Phone, AlertTriangle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSection } from '../context/SectionContext';
import logoMaily from '../../Logos/logomaily.png';
import logoLongevity from '../../Logos/Longevity360-03.png';
import logoCorporativo from '../../Logos/logocorporativo.png';
import logoCamsa from '../../Logos/camsa_final.png';
import googleIcon from '../../Logos/google_icon.png';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const countryRef = useRef(null);
  const stateRef = useRef(null);
  const cityRef = useRef(null);

  const { login, register, getDashboardPath } = useAuth();
  const { setCurrentSection } = useSection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionFromUrl = searchParams.get('section'); // e.g. 'longevity-360'

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
            // Priority: URL param > backend redirect section
            const effectiveSection = sectionFromUrl || result.redirectSection;
            if (effectiveSection) setCurrentSection(effectiveSection);
            const target = getSectionDashboardPath(effectiveSection);
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
        // Si tiene varias academias, mostrar selector (ej. si admin le dio acceso previo)
        if (result.sections?.length > 1) {
          setTimeout(() => navigate('/choose-section', { state: { sections: result.sections }, replace: true }), 100);
          return;
        }
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
    <main className="min-h-screen w-full flex flex-col justify-center px-4 py-8 md:px-6 md:py-12 relative overflow-x-hidden bg-surface font-plus-jakarta-sans text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Decorative Background Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 dot-pattern opacity-10 rotate-12 -z-10 hidden md:block"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 dot-pattern opacity-10 -rotate-6 -z-10 hidden md:block"></div>
      <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-primary-container rounded-full -z-10 hidden md:block"></div>
      <div className="absolute bottom-1/4 right-1/4 w-8 h-8 bg-tertiary-container rounded-full opacity-40 -z-10 hidden md:block"></div>

      {/* Login Container (The Card) - Using flex-col mobile, grid on lg */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 bg-surface-container-lowest rounded-xl ambient-shadow border border-outline-variant/10 z-10">
        
        {/* Illustration Column (Asymmetric 5/12) */}
        <div className="hidden lg:flex lg:col-span-5 bg-surface-container relative items-center justify-center p-12 overflow-hidden rounded-l-xl">
          <div className="absolute inset-0 dot-pattern opacity-5"></div>
          
          {/* Stylized Content Container */}
          <div className="relative z-10 w-full text-center">
            <div className="relative flex justify-center items-center w-full max-w-[350px] sm:max-w-[450px] lg:max-w-[550px] mx-auto px-4 -mt-4 mb-4 lg:-mt-8 lg:mb-8">
              <img alt="CAMSA World Academy" className="w-full h-auto object-contain transform scale-[1.3] sm:scale-[1.4] hover:scale-[1.45] transition-transform duration-500 will-change-transform relative z-10" src={logoCamsa}/>
            </div>
            
            <div className="relative z-20 flex flex-col items-center">
              <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-2">
                {isLogin ? 'Aprende con intención.' : 'Crea tu perfil ahora.'}
              </h2>
              <p className="text-on-surface-variant leading-relaxed max-w-xs mx-auto text-sm">
                {isLogin ? 'Únete a la plataforma donde la red social formativa conecta todo.' : 'Únete a la comunidad líder en educación continua y bienestar.'}
              </p>
            </div>

            {/* Platform Logos */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-6 pt-8 border-t border-outline-variant/20 px-4 w-full max-w-[90%] mx-auto">
              <img src={logoMaily} alt="Maily Academia" className="h-7 sm:h-8 w-auto object-contain filter drop-shadow hover:scale-105 transition-transform duration-300" />
              <img src={logoLongevity} alt="Longevity 360" className="h-7 sm:h-8 w-auto object-contain filter drop-shadow hover:scale-105 transition-transform duration-300" />
              <img src={logoCorporativo} alt="Corporativo CAMSA" className="h-9 sm:h-10 w-auto object-contain filter drop-shadow hover:scale-105 transition-transform duration-300" />
            </div>
          </div>
        </div>

        {/* Form Column (Asymmetric 7/12) */}
        <div className="lg:col-span-7 p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center">
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 bg-surface-container rounded-full w-fit mb-8 mx-auto lg:mx-0">
            <button 
              type="button"
              onClick={() => { setIsLogin(true); setErrors({}); setGeneralError(''); }}
              className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all ${isLogin ? 'bg-surface-container-lowest text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Iniciar Sesión
            </button>
            <button 
              type="button"
              onClick={() => { setIsLogin(false); setErrors({}); setGeneralError(''); }}
              className={`px-6 sm:px-8 py-2.5 rounded-full text-sm font-bold transition-all ${!isLogin ? 'bg-surface-container-lowest text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Registro
            </button>
          </div>

          {/* Header */}
          <div className="mb-6 lg:mb-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2 sm:mb-3">
              {isLogin ? 'Bienvenido a Maily' : 'Únete a Longevity 360'}
            </h1>
            <p className="text-on-surface-variant text-sm sm:text-base md:text-lg px-4 lg:px-0">
              {isLogin ? 'Ingresa tus datos para acceder a tu plataforma de estudio' : 'Crea tu cuenta libre para acceder a nuestra red.'}
            </p>
          </div>

          {/* ERROR MESSAGE ALERT */}
          <AnimatePresence>
            {generalError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-xl text-sm ${isAccountLocked ? 'bg-orange-50 border border-orange-200' : 'bg-red-50 border border-red-200'}`}
              >
                {isAccountLocked ? (
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-orange-500 flex-shrink-0 mt-0.5">warning</span>
                    <div>
                      <p className="font-medium text-orange-700">Cuenta bloqueada temporalmente</p>
                      <p className="text-orange-600 mt-1">{generalError}</p>
                      {lockoutInfo?.remainingMinutes > 0 && (
                        <p className="text-orange-500 mt-2 text-xs">
                          Puedes intentar de nuevo en {lockoutInfo.remainingMinutes} minuto(s).
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-red-600 font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined shrink-0 text-lg">error</span>
                    {generalError}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="register" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 sm:space-y-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#845400] pb-1 border-b border-surface-container-high">Datos Personales</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Nombre</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors text-xl">person</span>
                        <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={`w-full pl-11 sm:pl-12 pr-4 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base ${errors.firstName ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder="Tu nombre" type="text"/>
                      </div>
                      {errors.firstName && <p className="text-xs text-error mt-1 ml-2">{errors.firstName}</p>}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Apellidos</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors text-xl">person</span>
                        <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={`w-full pl-11 sm:pl-12 pr-4 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base ${errors.lastName ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder="Tus apellidos" type="text"/>
                      </div>
                      {errors.lastName && <p className="text-xs text-error mt-1 ml-2">{errors.lastName}</p>}
                    </div>
                  </div>

                  {/* Phone and DOB Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Teléfono</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors text-xl">call</span>
                        <input name="phone" value={formData.phone} onChange={handleInputChange} className={`w-full pl-11 sm:pl-12 pr-4 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base ${errors.phone ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder="10 dígitos" type="tel"/>
                      </div>
                      {errors.phone && <p className="text-xs text-error mt-1 ml-2">{errors.phone}</p>}
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Fecha Nacimiento</label>
                        <div className="relative group">
                          <input name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} className={`w-full pl-4 pr-10 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base ${errors.dateOfBirth ? 'ring-2 ring-error bg-error-container/20' : ''}`} type="date"/>
                        </div>
                        {errors.dateOfBirth && <p className="text-xs text-error mt-1 ml-2">{errors.dateOfBirth}</p>}
                    </div>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest text-[#845400] pb-1 border-b border-surface-container-high pt-2">Ubicación</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Country Listbox */}
                    <div className="relative space-y-1 z-30" ref={countryRef}>
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">País</label>
                        <button type="button" onClick={() => { setOpenCountry(!openCountry); setOpenState(false); setOpenCity(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-surface-container-low hover:bg-surface-container-lowest transition-colors ambient-shadow ${errors.country ? 'ring-2 ring-error' : ''}`}>
                          <span className="truncate">{formData.country ? `${COUNTRIES.find((c) => c.name === formData.country)?.flag} ${formData.country}` : 'País...'}</span>
                          <span className="material-symbols-outlined text-sm">expand_more</span>
                        </button>
                        <AnimatePresence>
                          {openCountry && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 right-0 mt-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-2xl max-h-48 overflow-y-auto">
                              {COUNTRIES.map((c) => (
                                <button key={c.id} type="button" onClick={() => handleCountrySelect(c.name)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-container">
                                  <span>{c.flag}</span><span className="truncate">{c.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                    </div>

                    {/* State */}
                    {(stateOptions.length > 0 || showStateOther) && (
                      <div className="relative space-y-1 z-20" ref={stateRef}>
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Estado</label>
                          {stateOptions.length > 0 ? (
                            <>
                              <button type="button" onClick={() => { setOpenState(!openState); setOpenCountry(false); setOpenCity(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-surface-container-low hover:bg-surface-container-lowest transition-colors ambient-shadow ${errors.state ? 'ring-2 ring-error' : ''}`}>
                                <span className="truncate">{formData.state || 'Estado...'}</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                              </button>
                              <AnimatePresence>
                                {openState && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 right-0 mt-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-2xl max-h-48 overflow-y-auto">
                                    {stateOptions.map((sn) => (
                                      <button key={sn} type="button" onClick={() => handleStateSelect(sn)} className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-surface-container">
                                        <span className="truncate">{sn}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <input name="state" value={formData.state} onChange={handleInputChange} className="w-full px-4 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-sm ambient-shadow focus:bg-surface-container-lowest" placeholder="Tu estado"/>
                          )}
                      </div>
                    )}

                    {/* City */}
                    {(cityOptions.length > 0 || (formData.state && (showCityOther || formData.city))) && (
                      <div className="relative space-y-1 z-10" ref={cityRef}>
                          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Ciudad</label>
                          {cityOptions.length > 0 ? (
                            <>
                              <button type="button" onClick={() => { setOpenCity(!openCity); setOpenCountry(false); setOpenState(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm bg-surface-container-low hover:bg-surface-container-lowest transition-colors ambient-shadow ${errors.city ? 'ring-2 ring-error' : ''}`}>
                                <span className="truncate">{formData.city || 'Ciudad...'}</span>
                                <span className="material-symbols-outlined text-sm">expand_more</span>
                              </button>
                              <AnimatePresence>
                                {openCity && (
                                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute left-0 right-0 mt-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest shadow-2xl max-h-48 overflow-y-auto">
                                    {cityOptions.map((cn) => (
                                      <button key={cn} type="button" onClick={() => handleCitySelect(cn)} className="w-full flex items-center px-3 py-2 text-sm text-left hover:bg-surface-container">
                                        <span className="truncate">{cn}</span>
                                      </button>
                                    ))}
                                    <div className="p-2 border-t border-outline-variant/30">
                                      <input name="city" placeholder="Otra..." value={cityOptions.includes(formData.city) ? '' : formData.city} onChange={handleInputChange} className="w-full text-sm bg-surface-container px-2 py-2 rounded focus:ring-1 focus:ring-primary focus:outline-none" />
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <input name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-sm ambient-shadow focus:bg-surface-container-lowest" placeholder="Tu ciudad"/>
                          )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-bold uppercase tracking-widest text-[#845400] pb-1 border-b border-surface-container-high pt-2">Seguridad</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Credencial de acceso (Email)</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors">mail</span>
                <input name="email" value={formData.email} onChange={handleInputChange} className={`w-full pl-11 sm:pl-14 pr-6 py-3 sm:py-4 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base ${errors.email ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder={isLogin ? "ejemplo@camsa.world" : "correo@ejemplo.com"} type="email"/>
              </div>
              {errors.email && <p className="text-xs text-error mt-1 ml-2">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center ml-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Contraseña</label>
                {isLogin && (
                  <Link to="/forgot-password" className="text-[10px] sm:text-xs font-bold text-[#845400] hover:text-on-primary-container transition-colors">¿Olvidaste tu contraseña?</Link>
                )}
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors">lock</span>
                <input name="password" value={formData.password} onChange={handleInputChange} className={`w-full pl-11 sm:pl-14 pr-12 py-3 sm:py-4 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base tracking-widest ${errors.password ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder="••••••••" type={showPassword ? "text" : "password"}/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-[var(--tw-colors-stitch-primary)] transition-colors focus:outline-none">
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              {errors.password && <p className="text-xs text-error mt-1 ml-2 leading-tight">{errors.password}</p>}
              
              {/* Password Requirements Checklist (Register Only) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pt-2 px-2 overflow-hidden">
                    <p className="text-[10px] font-bold text-on-surface-variant mb-2 uppercase tracking-wider">Tu contraseña debe incluir:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                      <div className={`flex items-center gap-1.5 transition-colors duration-300 ${formData.password.length >= PASSWORD_MIN_LENGTH ? 'text-green-600' : 'text-on-surface-variant/50'}`}>
                        <span className="material-symbols-outlined text-[16px]">{formData.password.length >= PASSWORD_MIN_LENGTH ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>10 caracteres mínimo</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors duration-300 ${PASSWORD_HAS_UPPER.test(formData.password) ? 'text-green-600' : 'text-on-surface-variant/50'}`}>
                        <span className="material-symbols-outlined text-[16px]">{PASSWORD_HAS_UPPER.test(formData.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>Una mayúscula</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors duration-300 ${PASSWORD_HAS_LOWER.test(formData.password) ? 'text-green-600' : 'text-on-surface-variant/50'}`}>
                        <span className="material-symbols-outlined text-[16px]">{PASSWORD_HAS_LOWER.test(formData.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>Una minúscula</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors duration-300 ${PASSWORD_HAS_DIGIT.test(formData.password) ? 'text-green-600' : 'text-on-surface-variant/50'}`}>
                        <span className="material-symbols-outlined text-[16px]">{PASSWORD_HAS_DIGIT.test(formData.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>Un número</span>
                      </div>
                      <div className={`flex items-center gap-1.5 transition-colors duration-300 ${PASSWORD_HAS_SPECIAL.test(formData.password) ? 'text-green-600' : 'text-on-surface-variant/50'}`}>
                        <span className="material-symbols-outlined text-[16px]">{PASSWORD_HAS_SPECIAL.test(formData.password) ? 'check_circle' : 'radio_button_unchecked'}</span>
                        <span>Un carácter especial</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm Password Field (Register Only) */}
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div key="confirmPassword" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1 pt-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-2">Confirmar Contraseña</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-[var(--tw-colors-stitch-primary)] transition-colors">lock</span>
                    <input name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className={`w-full pl-11 sm:pl-14 pr-12 py-3 sm:py-4 bg-surface-container-low border-transparent focus:border-transparent focus:ring-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/30 ambient-shadow focus:bg-surface-container-lowest transition-all text-sm sm:text-base tracking-widest ${errors.confirmPassword ? 'ring-2 ring-error bg-error-container/20' : ''}`} placeholder="••••••••" type={showConfirmPassword ? "text" : "password"}/>
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-[var(--tw-colors-stitch-primary)] transition-colors focus:outline-none">
                      <span className="material-symbols-outlined text-xl">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-error mt-1 ml-2">{errors.confirmPassword}</p>}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 sm:py-5 rounded-xl primary-gradient text-white font-bold text-base sm:text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary-container/20 mt-6 md:mt-8 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              ) : (
                <>
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-lg sm:text-xl">arrow_forward</span>
                </>
              )}
            </button>
            
            {!isLogin && (
              <p className="text-[10px] text-center text-on-surface-variant/60 mt-2 px-4">Al registrarte, aceptas nuestros <a href="#" className="underline">Términos de Servicio</a> y <a href="#" className="underline">Política de Privacidad</a>.</p>
            )}
          </form>

          {isLogin && (
            <>
              {/* Separator */}
              <div className="relative my-8 lg:my-10 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/30"></div>
                </div>
                <span className="relative px-4 sm:px-6 bg-surface-container-lowest text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">o inicia sesión con</span>
              </div>

              {/* Social Buttons */}
              <div className="flex justify-center w-full">
                <button type="button" className="w-full sm:max-w-sm flex items-center justify-center gap-3 px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 rounded-full hover:bg-surface-container-low transition-colors shadow-sm ambient-shadow group">
                  <img alt="Google" className="w-5 h-5 sm:w-6 sm:h-6 object-contain group-hover:scale-110 transition-transform" src={googleIcon}/>
                  <span className="text-sm sm:text-base font-bold text-on-surface">Continuar con Google</span>
                </button>
              </div>
            </>
          )}

          {/* Footer Text */}
          <p className="mt-8 lg:mt-10 text-center text-on-surface-variant/60 text-xs sm:text-sm">
            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}{' '}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setErrors({}); setGeneralError(''); }} className="text-[#845400] font-extrabold hover:underline bg-transparent border-0 cursor-pointer">
              {isLogin ? 'Regístrate gratis' : 'Inicia Sesión'}
            </button>
          </p>

        </div>
      </div>
    </main>
  );
};

export default Auth;
