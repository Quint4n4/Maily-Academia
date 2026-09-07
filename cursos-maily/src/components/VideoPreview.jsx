import { useMemo } from 'react';
import { Video, AlertCircle } from 'lucide-react';

const getEmbedUrl = (url, provider) => {
  if (!url) return null;

  if (provider === 'youtube' || !provider) {
    // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
    );
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }

  // For other providers, use the URL directly as iframe src
  if (['bunny', 'cloudflare', 'mux', 's3'].includes(provider)) {
    return url;
  }

  // Fallback: try to use the URL as-is if it looks embeddable
  if (url.startsWith('http')) return url;

  return null;
};

const VideoPreview = ({ url, provider = 'youtube', className = '' }) => {
  const embedUrl = useMemo(() => getEmbedUrl(url, provider), [url, provider]);

  if (!url) {
    return (
      <div className={`aspect-video bg-gray-100 dark:bg-gray-800 rounded-xl flex flex-col items-center justify-center ${className}`}>
        <Video size={40} className="text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Sin video asignado</p>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={`aspect-video bg-red-50 dark:bg-red-900/20 rounded-xl flex flex-col items-center justify-center ${className}`}>
        <AlertCircle size={40} className="text-red-300 dark:text-red-600 mb-2" />
        <p className="text-sm text-red-400 dark:text-red-500">URL de video no válida</p>
      </div>
    );
  }

  return (
    <div className={`aspect-video bg-black rounded-xl overflow-hidden ${className}`}>
      <iframe
        src={embedUrl}
        title="Vista previa del video"
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};

export default VideoPreview;
