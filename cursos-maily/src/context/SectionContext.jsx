import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SectionContext = createContext(null);

const DEFAULT_PUBLIC_SECTION_SLUG = 'longevity-360';
const SECTION_STORAGE_KEY = 'maily_current_section';

const pickDefaultSectionSlug = (sections) => {
  if (!Array.isArray(sections) || sections.length === 0) return null;

  const corporate = sections.find((s) => s.section_type === 'corporate');
  if (corporate) return corporate.slug;

  const maily = sections.find((s) => s.section_type === 'maily');
  if (maily) return maily.slug;

  // Fallback: primera sección pública o slug por defecto
  const publicSection = sections.find((s) => s.section_type === 'public');
  return publicSection?.slug || DEFAULT_PUBLIC_SECTION_SLUG;
};

export const useSection = () => {
  const ctx = useContext(SectionContext);
  if (!ctx) {
    throw new Error('useSection debe ser usado dentro de SectionContextProvider');
  }
  return ctx;
};

export const SectionContextProvider = ({ children }) => {
  const { user, redirectSection, userSections: authUserSections, isLoading: authIsLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState(() => {
    try {
      return localStorage.getItem(SECTION_STORAGE_KEY) || null;
    } catch { return null; }
  });
  const [availableSections, setAvailableSections] = useState([]);
  const [userSections, setUserSections] = useState([]);
  const [isLoadingSections, setIsLoadingSections] = useState(false);

  // Cargar secciones disponibles (públicas) para la landing y selector
  useEffect(() => {
    let cancelled = false;
    const loadAvailable = async () => {
      try {
        const { data } = await api.get('/sections/');
        if (!cancelled) {
          setAvailableSections(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setAvailableSections([]);
        }
      }
    };
    loadAvailable();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargar secciones del usuario autenticado
  useEffect(() => {
    let cancelled = false;

    // No limpiar la sección mientras auth sigue cargando — evita race condition en refresh
    // (user=null durante la carga inicial no significa que el usuario cerró sesión)
    if (authIsLoading) return () => { cancelled = true; };

    if (!user) {
      setUserSections([]);
      setCurrentSection(null);
      try { localStorage.removeItem(SECTION_STORAGE_KEY); } catch { /* */ }
      return () => {
        cancelled = true;
      };
    }

    const loadUserSections = async () => {
      setIsLoadingSections(true);
      try {
        const { data } = await api.get('/sections/my-sections/');
        if (cancelled) return;
        const sections = Array.isArray(data) ? data : [];
        setUserSections(sections);

        setCurrentSection((prev) => {
          if (prev) return prev;
          if (redirectSection) return redirectSection;
          const slug = pickDefaultSectionSlug(sections);
          return slug || DEFAULT_PUBLIC_SECTION_SLUG;
        });
      } catch {
        if (!cancelled) {
          // Fallback: usar secciones derivadas del login si existen; preservar sección actual
          const fallbackSections =
            Array.isArray(authUserSections) && authUserSections.length > 0
              ? authUserSections.map((slug) => ({ slug }))
              : [];
          setUserSections(fallbackSections);
          setCurrentSection((prev) => {
            if (prev) return prev;
            return redirectSection || DEFAULT_PUBLIC_SECTION_SLUG;
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSections(false);
        }
      }
    };

    loadUserSections();

    return () => {
      cancelled = true;
    };
  }, [user, redirectSection, authUserSections, authIsLoading]);

  const setCurrentSectionSlug = useCallback((slug) => {
    setCurrentSection(slug);
    try {
      if (slug) localStorage.setItem(SECTION_STORAGE_KEY, slug);
      else localStorage.removeItem(SECTION_STORAGE_KEY);
    } catch { /* storage not available */ }
  }, []);

  // Dado un rol y la sección activa, obtener la ruta de dashboard adecuada
  const getSectionDashboardPath = useCallback(
    (role) => {
      if (!role) return '/';

      if (role === 'admin') return '/admin/dashboard';
      if (role === 'instructor') return '/instructor/dashboard';

      const sectionSlug = currentSection || redirectSection || DEFAULT_PUBLIC_SECTION_SLUG;

      switch (sectionSlug) {
        case 'corporativo-camsa':
          return '/corporativo/dashboard';
        case 'maily-academia':
          return '/maily/dashboard';
        case 'longevity-360':
        default:
          return '/longevity/dashboard';
      }
    },
    [currentSection, redirectSection],
  );

  const value = useMemo(
    () => ({
      currentSection,
      availableSections,
      userSections,
      isLoadingSections,
      setCurrentSection: setCurrentSectionSlug,
      getSectionDashboardPath,
    }),
    [currentSection, availableSections, userSections, isLoadingSections, setCurrentSectionSlug, getSectionDashboardPath],
  );

  return <SectionContext.Provider value={value}>{children}</SectionContext.Provider>;
};

export default SectionContext;


