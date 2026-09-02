import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Modal accesible con:
 * - role="dialog", aria-modal="true", aria-labelledby apuntando al título
 * - Focus trap: el foco se mantiene dentro del modal mientras está abierto
 * - El foco se mueve al primer elemento interactivo al abrir
 * - Al cerrar, el foco regresa al elemento que lo abrió
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = ''
}) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  const modalRef = useRef(null);
  const anteriorFocoRef = useRef(null);
  const tituloId = title ? `modal-titulo-${Math.random().toString(36).slice(2, 9)}` : undefined;

  // Bloquear scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Mover el foco al modal al abrir; restaurarlo al cerrar
  useEffect(() => {
    if (isOpen) {
      // Guardar el elemento activo antes de abrir el modal
      anteriorFocoRef.current = document.activeElement;

      // Mover foco al primer elemento interactivo del modal
      const moverFoco = () => {
        if (!modalRef.current) return;
        const elementosInteractivos = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (elementosInteractivos.length > 0) {
          elementosInteractivos[0].focus();
        } else {
          modalRef.current.focus();
        }
      };
      // Pequeño delay para dejar que la animación inicie
      const timer = setTimeout(moverFoco, 50);
      return () => clearTimeout(timer);
    } else {
      // Restaurar el foco al elemento anterior al cerrar
      if (anteriorFocoRef.current && typeof anteriorFocoRef.current.focus === 'function') {
        anteriorFocoRef.current.focus();
      }
    }
  }, [isOpen]);

  // Focus trap: interceptar Tab y Shift+Tab para mantenerse dentro del modal
  const handleKeyDown = (e) => {
    if (!modalRef.current) return;

    // Cerrar con Escape
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key !== 'Tab') return;

    const elementosInteractivos = Array.from(
      modalRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    if (elementosInteractivos.length === 0) return;

    const primero = elementosInteractivos[0];
    const ultimo = elementosInteractivos[elementosInteractivos.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: si el foco está en el primer elemento, ir al último
      if (document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      }
    } else {
      // Tab: si el foco está en el último elemento, ir al primero
      if (document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onKeyDown={handleKeyDown}
          >
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className={`
                w-full ${sizes[size]}
                bg-white rounded-2xl shadow-2xl
                overflow-hidden
                outline-none
                ${className}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || showClose) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  {title && (
                    <h2 id={tituloId} className="text-xl font-semibold text-gray-900">{title}</h2>
                  )}
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                      aria-label="Cerrar modal"
                    >
                      <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Modal;
