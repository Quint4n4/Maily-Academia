import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../components/ui';

/**
 * Confirmaciones sin `window.confirm`.
 *
 * Por que existe: `window.confirm` dibuja el cuadro gris del navegador, con el
 * "localhost:5173 dice" delante del mensaje. No respeta el tema oscuro, no se
 * puede traducir ni maquetar, y algunos navegadores lo bloquean si el usuario
 * marca "no volver a mostrar". La aplicacion ya tenia un `Modal` accesible y un
 * sistema de avisos; esto solo los conecta.
 *
 * Como se usa:
 *
 *   const confirmar = useConfirm();
 *
 *   const borrar = async () => {
 *     const ok = await confirmar({
 *       titulo: 'Eliminar curso',
 *       mensaje: `¿Eliminar "${curso.title}"?`,
 *       textoConfirmar: 'Eliminar',
 *       peligro: true,
 *     });
 *     if (!ok) return;
 *     ...
 *   };
 *
 * Devuelve una promesa que se resuelve a `true` o `false`, igual que
 * `window.confirm`, para que sustituirlo sea cambiar una linea y anadir `await`.
 */
const ConfirmContext = createContext(null);

const OPCIONES_POR_DEFECTO = {
  titulo: 'Confirmar acción',
  mensaje: '¿Seguro que quieres continuar?',
  textoConfirmar: 'Aceptar',
  textoCancelar: 'Cancelar',
  peligro: false,
  detalle: '',
};

export const ConfirmProvider = ({ children }) => {
  const [estado, setEstado] = useState({ abierto: false, opciones: OPCIONES_POR_DEFECTO });

  // Guarda el `resolve` de la promesa que espera la respuesta del usuario.
  const resolverRef = useRef(null);

  const confirmar = useCallback((opciones = {}) => {
    setEstado({ abierto: true, opciones: { ...OPCIONES_POR_DEFECTO, ...opciones } });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const responder = useCallback((respuesta) => {
    setEstado((prev) => ({ ...prev, abierto: false }));
    // Cerrar sin responder dejaria la promesa colgada para siempre y con ella
    // la funcion que la espera, asi que todas las salidas pasan por aqui.
    if (resolverRef.current) {
      resolverRef.current(respuesta);
      resolverRef.current = null;
    }
  }, []);

  const { titulo, mensaje, detalle, textoConfirmar, textoCancelar, peligro } = estado.opciones;

  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}

      <Modal
        isOpen={estado.abierto}
        onClose={() => responder(false)}
        title={titulo}
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex gap-3">
            {peligro && (
              <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-gray-700 dark:text-gray-200">{mensaje}</p>
              {detalle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">{detalle}</p>
              )}
            </div>
          </div>

          {/* Cancelar va PRIMERO en el DOM a proposito: el Modal mueve el foco al
              primer elemento interactivo, y no queremos que un Enter de mas
              dispare un borrado. */}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => responder(false)}>
              {textoCancelar}
            </Button>
            <Button
              variant={peligro ? 'danger' : 'primary'}
              onClick={() => responder(true)}
            >
              {textoConfirmar}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

/** Devuelve `confirmar(opciones) => Promise<boolean>`. */
export const useConfirm = () => {
  const contexto = useContext(ConfirmContext);
  if (!contexto) {
    throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  }
  return contexto;
};

export default ConfirmContext;
