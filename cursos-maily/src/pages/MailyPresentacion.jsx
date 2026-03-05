import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import logoMaily from '../../Logos/logomaily.png';
import api from '../services/api';

function toEmbedUrl(raw = '') {
  const url = raw.trim();
  if (!url) return url;
  if (/youtube\.com\/embed\//.test(url)) return url;
  const watchMatch = url.match(/youtube\.com\/watch[?&]v=([^&\s]+)/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([^?&\s]+)/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&\s]+)/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  const vimeoMatch = url.match(/^https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

const MailyPresentacion = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/sections/maily-academia/promo-videos/')
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        // La API puede devolver:
        // - lista directa: [ ... ]
        // - paginada: { results: [...] }
        // - u otro envoltorio tipo { promo_videos: [...] }
        const raw =
          data?.results ??
          data?.promo_videos ??
          data;
        const items = Array.isArray(raw) ? raw : [];
        setVideos(items);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/longevity/dashboard"
          className="inline-flex items-center gap-2 text-maily dark:text-blue-400 hover:text-maily-dark dark:hover:text-blue-300 text-sm font-medium mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-10"
        >
          <img
            src={logoMaily}
            alt="Maily Academia"
            className="h-16 w-auto object-contain"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Videos de presentación
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Conoce Maily Academia y aprende a sacar el máximo partido a la plataforma.
            </p>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
          </div>
        ) : videos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No hay videos de presentación disponibles en este momento.
          </p>
        ) : (
          <div className="space-y-8">
            {videos.map((video, i) => (
              <motion.section
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
              >
                <div className="aspect-video bg-gray-900 relative">
                  <iframe
                    src={toEmbedUrl(video.embed_url)}
                    title={video.title}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {video.duration && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                      <Play className="w-3 h-3" />
                      {video.duration}
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {video.title}
                  </h2>
                  {video.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {video.description}
                    </p>
                  )}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MailyPresentacion;
