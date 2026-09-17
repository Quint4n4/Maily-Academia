import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Panel lateral derecho para formularios.
 *
 * Mismo contrato que `Modal` (isOpen, onClose, title, children, size) para que
 * cambiar uno por otro sea cambiar el nombre del componente. Lo que cambia es
 * de donde sale: entra deslizandose desde la derecha y ocupa el alto completo.
 *
 * Por que un panel y no una ventana centrada: un formulario largo --crear un
 * estudiante son once campos-- en una ventana centrada empuja la pagina, tapa la
 * tabla que estabas mirando y obliga a hacer scroll dentro de un recuadro. El
 * panel deja la tabla a la vista a la izquierda y tiene todo el alto para el
 * formulario.
 *
 * Conserva las mismas garantias de accesibilidad que `Modal`, que no son
 * decorativas: foco atrapado dentro, Escape cierra, el foco vuelve a donde
 * estaba al cerrar, `aria-modal` y titulo enlazado por `aria-labelledby`.
 */
export const SidePanel = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className = '',
}) => {
  const anchos = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
  };

  const panelRef = useRef(null);
  const anteriorFocoRef = useRef(null);
  const tituloId = title ? `panel-titulo-${String(title).replace(/\s+/g, '-').toLowerCase()}` : undefined;

  // Bloquear el scroll del fondo mientras el panel esta abierto
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

  // Mover el foco al panel al abrir; devolverlo al cerrar
  useEffect(() => {
    if (isOpen) {
      anteriorFocoRef.current = document.activeElement;
      const moverFoco = () => {
        if (!panelRef.current) return;
        const interactivos = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (interactivos.length > 0) interactivos[0].focus();
        else panelRef.current.focus();
      };
      const timer = setTimeout(moverFoco, 50);
      return () => clearTimeout(timer);
    }
    if (anteriorFocoRef.current && typeof anteriorFocoRef.current.focus === 'function') {
      anteriorFocoRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (!panelRef.current) return;

    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;

    const interactivos = Array.from(
      panelRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (interactivos.length === 0) return;

    const primero = interactivos[0];
    const ultimo = interactivos[interactivos.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      }
    } else if (document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 z-50 flex" onKeyDown={handleKeyDown}>
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              tabIndex={-1}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className={`
                w-screen ${anchos[size]}
                h-full flex flex-col
                bg-white dark:bg-gray-800
                shadow-2xl outline-none
                ${className}
              `}
              onClick={(e) => e.stopPropagation()}
            >
              {(title || showClose) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
                  {title && (
                    <h2 id={tituloId} className="text-xl font-semibold text-gray-900 dark:text-white">
                      {title}
                    </h2>
                  )}
                  {showClose && (
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Cerrar panel"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              )}

              {/* El scroll vive aqui dentro: la cabecera se queda fija arriba
                  aunque el formulario sea largo. */}
              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SidePanel;
