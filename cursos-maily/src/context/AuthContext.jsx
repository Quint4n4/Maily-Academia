import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';
import { setTokens, clearTokens, getRefreshToken, doRefresh } from '../services/api';

const AuthContext = createContext(null);

/** Nombre para mostrar: solo de nombre y apellido. Si faltan ambos, usuario. Nunca correo. */
function getDisplayName(firstName, lastName, username) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || username || 'Usuario';
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [redirectSection, setRedirectSection] = useState(null);
  const [userSections, setUserSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      const firstName = userData.first_name ?? '';
      const lastName = userData.last_name ?? '';
      const displayName = getDisplayName(firstName, lastName, userData.username);
      setUser({
        id: userData.id,
        email: userData.email,
        username: userData.username,
        firstName,
        lastName,
        name: displayName,
        role: userData.role,
        isSuperAdmin: !!userData.is_super_admin,
        dateJoined: userData.date_joined,
        avatar: userData.profile?.avatar
          || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4A90A4&color=fff`,
        bio: userData.profile?.bio || '',
        phone: userData.profile?.phone || '',
        country: userData.profile?.country || '',
        state: userData.profile?.state || '',
        city: userData.profile?.city || '',
        dateOfBirth: userData.profile?.date_of_birth || null,
        occupationType: userData.profile?.occupation_type || '',
        hasCompletedSurvey: !!userData.profile?.has_completed_survey,
        age: userData.profile?.age ?? null,
        instructorSection: userData.instructor_section || null,
      });
    } catch {
      clearTokens();
      setUser(null);
    }
  }, []);

  // Restaura la sesión al recargar la página usando el refresh token almacenado.
  // Usa doRefresh() compartida con el interceptor para evitar dos renovaciones simultáneas.
  useEffect(() => {
    const tryRestore = async () => {
      const refresh = getRefreshToken();
      if (refresh) {
        try {
          await doRefresh();
          await fetchUser();
        } catch {
          clearTokens();
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    tryRestore();
  }, [fetchUser]);

  const login = async (email, password) => {
    try {
      const data = await authService.login(email, password);

      // Leer opcionalmente redirect_section y secciones devueltas por el backend
      const nextRedirectSection = data?.redirect_section || null;
      const nextSections = Array.isArray(data?.user?.sections) ? data.user.sections : [];

      setRedirectSection(nextRedirectSection);
      setUserSections(nextSections);

      await fetchUser();
      return { success: true, redirectSection: nextRedirectSection, sections: nextSections };
    } catch (error) {
      const data = error.response?.data;
      
      // Manejar cuenta bloqueada
      if (data?.error === 'account_locked') {
        return { 
          success: false, 
          error: data.message,
          isLocked: true,
          lockedUntil: data.locked_until,
          remainingMinutes: data.remaining_minutes,
        };
      }
      
      // Manejar intentos restantes
      const remainingAttempts = data?.remaining_attempts;
      let message = data?.detail || data?.non_field_errors?.[0] || 'Credenciales incorrectas';
      
      if (remainingAttempts !== undefined && remainingAttempts > 0) {
        message = `Credenciales incorrectas. Te quedan ${remainingAttempts} intento${remainingAttempts === 1 ? '' : 's'}.`;
      }
      
      return { success: false, error: message, remainingAttempts };
    }
  };

  const register = async (userData) => {
    try {
      await authService.register(userData);
      // Auto-login after registration (registro público = solo Longevity 360)
      const loginData = await authService.login(userData.email, userData.password);
      setRedirectSection(loginData?.redirect_section || 'longevity-360');
      setUserSections(Array.isArray(loginData?.user?.sections) ? loginData.user.sections : ['longevity-360']);
      await fetchUser();
      return { success: true, redirectSection: loginData?.redirect_section || 'longevity-360', sections: loginData?.user?.sections || ['longevity-360'] };
    } catch (error) {
      const data = error.response?.data;
      let message = 'Error al registrar';
      if (data) {
        const firstError = (field) => (Array.isArray(field) ? field[0] : field);
        if (data.email) message = firstError(data.email);
        else if (data.phone) message = firstError(data.phone);
        else if (data.first_name) message = firstError(data.first_name);
        else if (data.last_name) message = firstError(data.last_name);
        else if (data.password) message = firstError(data.password);
        else if (data.password_confirm) message = firstError(data.password_confirm);
        else if (data.detail) message = data.detail;
      }
      return { success: false, error: message };
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (updates) => {
    try {
      const updated = await authService.updateProfile(updates);
      const displayName = getDisplayName(updated.first_name, updated.last_name, updated.username);
      setUser((prev) => ({
        ...prev,
        firstName: updated.first_name,
        lastName: updated.last_name,
        name: displayName,
        username: updated.username,
        bio: updated.profile?.bio || '',
        phone: updated.profile?.phone || '',
        country: updated.profile?.country || '',
        state: updated.profile?.state || '',
        city: updated.profile?.city || '',
        dateOfBirth: updated.profile?.date_of_birth || null,
        occupationType: updated.profile?.occupation_type || '',
        hasCompletedSurvey: !!updated.profile?.has_completed_survey,
        age: updated.profile?.age ?? prev?.age ?? null,
        avatar: updated.profile?.avatar ?? prev?.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4A90A4&color=fff`,
      }));
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Error al actualizar perfil' };
    }
  };

  const markSurveyCompleted = () => {
    setUser((prev) => (prev ? { ...prev, hasCompletedSurvey: true } : prev));
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin': return '/admin/dashboard';
      case 'instructor': return '/instructor/dashboard';
      default: return '/dashboard';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      redirectSection,
      userSections,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      markSurveyCompleted,
      getDashboardPath,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
