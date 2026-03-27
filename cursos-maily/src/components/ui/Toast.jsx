import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// Configuración visual de cada tipo de toast
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    iconClass: 'text-green-600 dark:text-green-400',
    titleClass: 'text-green-800 dark:text-green-200',
    textClass: 'text-green-700 dark:text-green-300',
    barClass: 'bg-green-500',
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
    titleClass: 'text-red-800 dark:text-red-200',
    textClass: 'text-red-700 dark:text-red-300',
    barClass: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-800 dark:text-amber-200',
    textClass: 'text-amber-700 dark:text-amber-300',
    barClass: 'bg-amber-500',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    textClass: 'text-blue-700 dark:text-blue-300',
    barClass: 'bg-blue-500',
  },
};

// Componente de un toast individual
const ToastItem = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  // Animación de entrada
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Animación de salida y remoción
  const handleRemove = () => {
    setLeaving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  // Auto-dismiss
  useEffect(() => {
    if (!toast.duration) return;
    const t = setTimeout(handleRemove, toast.duration);
    return () => clearTimeout(t);
  }, [toast.duration]);

  return (
    <div
      className={`
        relative flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        max-w-sm w-full overflow-hidden
        transition-all duration-300 ease-in-out
        ${config.containerClass}
        ${visible && !leaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Icono */}
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${config.iconClass}`} />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold leading-snug ${config.titleClass}`}>
            {toast.title}
          </p>
        )}
        <p className={`text-sm leading-snug ${toast.title ? 'mt-0.5' : ''} ${config.textClass}`}>
          {toast.message}
        </p>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={handleRemove}
        className={`flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity ${config.iconClass}`}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>

      {/* Barra de progreso */}
      {toast.duration && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 ${config.barClass}`}
          style={{
            animation: `shrink ${toast.duration}ms linear forwards`,
          }}
        />
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Contenedor de todos los toasts (renderiza en un portal)
const ToastContainer = ({ toasts, onRemove }) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
