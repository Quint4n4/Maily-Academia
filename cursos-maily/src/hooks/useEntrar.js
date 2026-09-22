import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useSection } from '../context/SectionContext';

/**
 * A dónde va alguien después de entrar, y el botón de Google.
 *
 * Sale de `pages/Auth.jsx`, donde vivía dentro del componente. Se extrae aquí
 * porque ahora hay dos pantallas de entrada --la de Academy360 y la actual-- y
 * esta lógica NO puede duplicarse: si se copia, un día las dos puertas dejan a
 * la misma persona en pantallas distintas, que es justo lo que el comentario
 * original advertía.
 *
 * `Auth.jsx` todavía tiene su propia copia. Se migra a este hook en el corte,
 * cuando la pantalla nueva sustituya a la vieja; hasta entonces no se toca el
 * archivo que está en producción.
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_SCRIPT_ID = 'gsi-client';

export const hayGoogle = Boolean(GOOGLE_CLIENT_ID);

export function useEntrar() {
  const { getDashboardPath } = useAuth();
  const { setCurrentSection, getSectionDashboardPath } = useSection();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sectionFromUrl = searchParams.get('section');

  /**
   * Con varias academias manda el selector; una cuenta recién creada pasa por
   * la encuesta; el resto va a su panel.
   */
  const irAlDestino = (result, esCuentaNueva = false) => {
    if (result.sections?.length > 1) {
      setTimeout(
        () => navigate('/choose-section', { state: { sections: result.sections }, replace: true }),
        100,
      );
      return;
    }
    if (esCuentaNueva) {
      setTimeout(() => navigate('/survey'), 100);
      return;
    }
    setTimeout(() => {
      const basePath = getDashboardPath();
      if (basePath === '/dashboard') {
        const effectiveSection = sectionFromUrl || result.redirectSection;
        if (effectiveSection) setCurrentSection(effectiveSection);
        const target = getSectionDashboardPath(effectiveSection);
        navigate(target || '/dashboard', { replace: true });
      } else {
        navigate(basePath, { replace: true });
      }
    }, 100);
  };

  return { irAlDestino };
}

/**
 * Carga el script de Google y pinta su botón oficial dentro de `contenedor`.
 *
 * `alRecibir` se guarda en una ref porque el callback se le entrega a Google
 * UNA vez, al inicializar: pasándole la función directamente, Google se
 * quedaría con la versión de ese render y seguiría llamándola con el estado de
 * entonces.
 *
 * La ref la crea el hook y la devuelve, en vez de recibirla: un hook no debe
 * escribir en algo que le pasan --aquí se vacía el div antes de pintar-- porque
 * quien lo llama no puede saber que su ref va a cambiar por dentro.
 *
 * @param {Function} alRecibir recibe la respuesta con el token
 * @param {boolean} activo si es false, no se pinta nada
 * @returns ref para el div donde Google pinta su botón
 */
export function useBotonDeGoogle(alRecibir, activo = true) {
  const contenedor = useRef(null);
  const callbackVigente = useRef(() => {});

  // Se actualiza en cada render para que Google llame SIEMPRE a la última
  // versión. Escribir la ref durante el render está prohibido; en un efecto no.
  useEffect(() => {
    callbackVigente.current = alRecibir;
  });

  useEffect(() => {
    if (!activo || !GOOGLE_CLIENT_ID) return undefined;

    const pintar = () => {
      if (!window.google?.accounts?.id || !contenedor.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (respuesta) => callbackVigente.current(respuesta),
      });
      contenedor.current.innerHTML = '';
      window.google.accounts.id.renderButton(contenedor.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        logo_alignment: 'center',
        locale: 'es',
        width: 320,
      });
    };

    if (window.google?.accounts?.id) {
      pintar();
      return undefined;
    }

    // El script puede estar ya en la página de un montaje anterior: cargarlo
    // dos veces deja dos clientes de Google compitiendo por el mismo botón.
    const yaEsta = document.getElementById(GOOGLE_SCRIPT_ID);
    if (yaEsta) {
      yaEsta.addEventListener('load', pintar);
      return () => yaEsta.removeEventListener('load', pintar);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = pintar;
    document.head.appendChild(script);
    return undefined;
  }, [activo]);

  return contenedor;
}

export default useEntrar;
