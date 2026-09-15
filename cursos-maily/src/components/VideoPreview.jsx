import { useEffect, useMemo, useRef, useState } from 'react';
import { Video, AlertCircle, Loader2 } from 'lucide-react';
import courseService from '../services/courseService';

/**
 * YouTube se resuelve aqui porque sus videos son publicos: no hay nada que
 * proteger y evitamos una peticion.
 */
const urlDeYoutube = (url) => {
  const match = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
};

/**
 * Reproductor de una leccion.
 *
 * Para cualquier proveedor que no sea YouTube, la URL se PIDE AL SERVIDOR en
 * lugar de construirla aqui. Antes este componente ponia la URL guardada como
 * `src` del iframe, y una URL directa sin firmar es publica para quien la tenga.
 *
 * El servidor firma la URL con una clave que nunca sale de el, y comprueba que
 * quien la pide tenga acceso al curso. La firma dura poco, asi que se renueva
 * sola antes de caducar mientras el reproductor siga montado.
 *
 * `lessonId` es lo unico que hace falta para los proveedores firmados; `url` y
 * `provider` siguen aceptandose para las vistas previas del constructor, donde
 * el instructor todavia no ha guardado la leccion.
 */
const VideoPreview = ({ lessonId, url, provider = 'youtube', className = '' }) => {
  const esYoutube = !provider || provider === 'youtube';
  const [urlFirmada, setUrlFirmada] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const temporizador = useRef(null);

  const urlDirecta = useMemo(() => (esYoutube ? urlDeYoutube(url) : null), [esYoutube, url]);

  useEffect(() => {
    // YouTube y las vistas previas sin leccion guardada no piden nada.
    if (esYoutube || !lessonId) return undefined;

    let vigente = true;

    const pedir = async () => {
      setCargando(true);
      setError('');
      try {
        const datos = await courseService.urlDeVideo(lessonId);
        if (!vigente) return;
        setUrlFirmada(datos.url);

        // Se renueva un minuto antes de caducar, para que no se corte a mitad.
        if (datos.expira_en) {
          const margen = Math.max((datos.expira_en - 60) * 1000, 30_000);
          temporizador.current = setTimeout(pedir, margen);
        }
      } catch (err) {
        if (!vigente) return;
        setError(
          err?.response?.status === 404
            ? 'No tienes acceso a este video.'
            : 'No se pudo cargar el video. Inténtalo de nuevo.',
        );
      } finally {
        if (vigente) setCargando(false);
      }
    };

    pedir();
    return () => {
      vigente = false;
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [esYoutube, lessonId]);

  const fuente = esYoutube ? urlDirecta : urlFirmada;

  if (esYoutube && !url) {
    return (
      <div className={`aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center ${className}`}>
        <Video size={40} className="text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Sin video asignado</p>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className={`aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center ${className}`}>
        <Loader2 size={32} className="text-gray-400 dark:text-gray-500 mb-2 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando video…</p>
      </div>
    );
  }

  if (error || !fuente) {
    return (
      <div className={`aspect-video bg-red-50 dark:bg-red-900/20 rounded-xl flex flex-col items-center justify-center ${className}`}>
        <AlertCircle size={40} className="text-red-400 dark:text-red-500 mb-2" />
        <p className="text-sm text-red-700 dark:text-red-400">
          {error || 'URL de video no válida'}
        </p>
      </div>
    );
  }

  return (
    <div className={`aspect-video bg-black rounded-xl overflow-hidden ${className}`}>
      <iframe
        src={fuente}
        title="Reproductor de video de la lección"
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};

export default VideoPreview;
