import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, ExternalLink, Search } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import certificateService from '../services/certificateService';

const Certificates = () => {
  const { certificates, loadCertificates } = useProgress();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (cert) => {
    setDownloading(cert.id);
    try {
      const blob = await certificateService.downloadPdf(cert.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado-${cert.course_title || cert.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch { /* empty */ }
    setDownloading(null);
  };

  useEffect(() => {
    const load = async () => {
      await loadCertificates();
      setLoading(false);
    };
    load();
  }, []);

  const filtered = certificates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.course_title || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-maily border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mis Certificados</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{certificates.length} certificados obtenidos</p>
      </div>

      {certificates.length > 0 && (
        <div className="mb-6">
          <Input placeholder="Buscar certificados..." icon={<Search size={18} />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Award size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {certificates.length === 0 ? 'Aún no tienes certificados' : 'No se encontraron resultados'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Completa cursos para obtener tus certificados de finalización.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Award size={28} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {cert.course_title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Otorgado el{' '}
                      {new Date(cert.issued_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="accent" size="sm">
                        Código: {cert.verification_code}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<ExternalLink size={14} />}
                      onClick={() =>
                        window.open(`/verify/${cert.verification_code}`, '_blank')
                      }
                    >
                      Verificar
                    </Button>
                    <Button
                      size="sm"
                      icon={<Download size={14} />}
                      loading={downloading === cert.id}
                      onClick={() => handleDownload(cert)}
                    >
                      Descargar PDF
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificates;
