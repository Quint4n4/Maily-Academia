import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, ExternalLink, Search } from 'lucide-react';
import { Card, Button, Input, Badge } from '../components/ui';
import { useProgress } from '../context/ProgressContext';
import { useSection } from '../context/SectionContext';
import { isCamsa } from '../theme/camsaTheme';
import certificateService from '../services/certificateService';

const Certificates = () => {
  const { certificates, loadCertificates } = useProgress();
  const { currentSection } = useSection();
  const isC = isCamsa(currentSection);

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
        <h1 className={`text-3xl font-bold ${ isC ? 'text-[#e6c364]' : 'text-gray-900 dark:text-white' }`}>Mis Certificados</h1>
        <p className={`mt-1 ${ isC ? 'text-[#d0c5b2]' : 'text-gray-500 dark:text-gray-400' }`}>{certificates.length} certificados obtenidos</p>
      </div>

      {certificates.length > 0 && (
        <div className="mb-6">
          <Input placeholder="Buscar certificados..." icon={<Search size={18} />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <Card className={`p-12 text-center ${ isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] shadow-none' : '' }`}>
          <Award size={48} className={`mx-auto mb-4 ${ isC ? 'text-[#c9a84c]/30' : 'text-gray-300 dark:text-gray-600' }`} />
          <h3 className={`text-lg font-semibold mb-2 ${ isC ? 'text-[#f5f0e8]' : 'text-gray-900 dark:text-white' }`}>
            {certificates.length === 0 ? 'Aún no tienes certificados' : 'No se encontraron resultados'}
          </h3>
          <p className={`${ isC ? 'text-[#8a8578]' : 'text-gray-500 dark:text-gray-400' } text-sm`}>
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
              <Card className={`p-5 ${ isC ? 'bg-[#1f1f1c] border-[rgba(77,70,55,0.3)] shadow-none hover:border-[rgba(230,195,100,0.3)] transition-colors' : '' }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${ isC ? 'bg-[#c9a84c]/10' : 'bg-yellow-100 dark:bg-yellow-900/30' }`}>
                    <Award size={28} className={ isC ? 'text-[#e6c364]' : 'text-yellow-600 dark:text-yellow-400' } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold ${ isC ? 'text-[#f5f0e8]' : 'text-gray-900 dark:text-white' }`}>
                      {cert.course_title}
                    </h3>
                    <p className={`text-sm mt-0.5 ${ isC ? 'text-[#8a8578]' : 'text-gray-500 dark:text-gray-400' }`}>
                      Otorgado el{' '}
                      {new Date(cert.issued_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="accent" size="sm" className={ isC ? 'bg-[#e6c364]/10 text-[#e6c364] border-none' : '' }>
                        Código: {cert.verification_code}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <Button
                      variant={isC ? 'outline' : 'secondary'}
                      size="sm"
                      icon={<ExternalLink size={14} />}
                      onClick={() =>
                        window.open(`/verify/${cert.verification_code}`, '_blank')
                      }
                      className={isC ? 'border-[rgba(77,70,55,0.5)] text-[#d0c5b2] hover:bg-white/5 hover:text-[#e6c364]' : ''}
                    >
                      Verificar
                    </Button>
                    <Button
                      size="sm"
                      icon={<Download size={14} />}
                      loading={downloading === cert.id}
                      onClick={() => handleDownload(cert)}
                      className={isC ? 'bg-[#e6c364] text-[#141311] hover:bg-[#c9a84c]' : ''}
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
