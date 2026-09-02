import { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ui/Toast';

const ToastContext = createContext(null);

/**
 * ToastProvider — Envuelve la app y provee el sistema de notificaciones.
 * Los toasts se renderizan en un portal en document.body.
 */
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Genera un ID único para cada toast
  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  /**
   * Muestra un toast.
   * @param {string} message - Texto del toast
   * @param {('success'|'error'|'warning'|'info')} type - Tipo visual
   * @param {number} duration - Duración en ms (0 = no auto-dismiss)
   * @param {string} [title] - Título opcional
   */
  const showToast = useCallback((message, type = 'info', duration = 4000, title = '') => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type, duration, title }]);
    return id;
  }, []);

  // Atajos por tipo
  const success = useCallback((message, duration, title) => showToast(message, 'success', duration, title), [showToast]);
  const error = useCallback((message, duration, title) => showToast(message, 'error', duration, title), [showToast]);
  const warning = useCallback((message, duration, title) => showToast(message, 'warning', duration, title), [showToast]);
  const info = useCallback((message, duration, title) => showToast(message, 'info', duration, title), [showToast]);

  // Remueve un toast por ID
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Limpia todos los toasts
  const clearToasts = useCallback(() => setToasts([]), []);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast, clearToasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook para usar el sistema de toasts desde cualquier componente.
 * Expone: showToast, success, error, warning, info, removeToast, clearToasts
 */
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
};

export default ToastContext;
