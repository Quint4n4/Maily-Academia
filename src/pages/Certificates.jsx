import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Download,
  Share2,
  Calendar,
  BookOpen,
  X,
  Heart,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { Card, Button, Badge, Modal } from '../components/ui';
import coursesData from '../data/courses';

const Certificates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCertificates } = useProgress();
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const certificateRef = useRef(null);

  const certificates = getCertificates();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleDownload = async (cert) => {
    // Crear elemento canvas para generar imagen
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Fondo
    const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 800);

    // Borde decorativo
    ctx.strokeStyle = '#4A90A4';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 1120, 720);

    // Borde interno
    ctx.strokeStyle = '#E8F4F8';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 1100, 700);

    // Logo (corazón simple)
    ctx.fillStyle = '#4A90A4';
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('♥', 600, 120);

    // Título del certificado
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICADO DE FINALIZACIÓN', 600, 200);

    // Subtítulo
    ctx.fillStyle = '#64748b';
    ctx.font = '20px Arial';
    ctx.fillText('Este certificado se otorga a', 600, 280);

    // Nombre del usuario
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 44px Georgia';
    ctx.fillText(cert.userName || 'Usuario', 600, 350);

    // Línea decorativa
    ctx.strokeStyle = '#4A90A4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 380);
    ctx.lineTo(900, 380);
    ctx.stroke();

    // Texto de completación
    ctx.fillStyle = '#64748b';
    ctx.font = '20px Arial';
    ctx.fillText('por completar exitosamente', 600, 440);

    // Nombre del módulo
    ctx.fillStyle = '#4A90A4';
    ctx.font = 'bold 32px Georgia';
    ctx.fillText(cert.moduleTitle, 600, 500);

    // Nombre del curso
    ctx.fillStyle = '#1e293b';
    ctx.font = '24px Arial';
    ctx.fillText(`del curso "${cert.courseTitle}"`, 600, 550);

    // Fecha
    ctx.fillStyle = '#64748b';
    ctx.font = '18px Arial';
    ctx.fillText(`Emitido el ${formatDate(cert.issuedAt)}`, 600, 620);

    // Número de certificado
    ctx.font = '14px Arial';
    ctx.fillText(`Certificado No. ${cert.certificateNumber}`, 600, 660);

    // Marca de agua
    ctx.fillStyle = '#4A90A4';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Cursos Maily Te Cuida', 600, 720);

    // Descargar
    const link = document.createElement('a');
    link.download = `certificado-${cert.certificateNumber}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (certificates.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <Award className="w-12 h-12 text-gray-400" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Aún no tienes certificados
            </h1>
            <p className="text-gray-500 mb-6">
              Completa los módulos de los cursos para obtener tus certificados
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Explorar cursos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mis Certificados
          </h1>
          <p className="text-gray-500">
            Has obtenido {certificates.length} certificado{certificates.length !== 1 ? 's' : ''}
          </p>
        </motion.div>

        {/* Lista de certificados */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                hover
                className="cursor-pointer"
                onClick={() => setSelectedCertificate(cert)}
              >
                {/* Preview del certificado */}
                <div className="bg-gradient-to-br from-maily-light to-white rounded-xl p-6 mb-4 border border-maily/20 relative overflow-hidden">
                  <div className="absolute top-2 right-2">
                    <Award className="w-8 h-8 text-maily/30" />
                  </div>
                  <div className="text-center">
                    <Heart className="w-8 h-8 mx-auto text-maily mb-2" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Certificado
                    </p>
                    <p className="font-semibold text-gray-900 mt-1 line-clamp-2">
                      {cert.moduleTitle}
                    </p>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <Badge variant="success" size="sm" className="mb-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completado
                  </Badge>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {cert.moduleTitle}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {cert.courseTitle}
                  </p>
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(cert.issuedAt)}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Modal de certificado */}
        <Modal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          size="lg"
          title=""
        >
          {selectedCertificate && (
            <div>
              {/* Vista previa del certificado */}
              <div
                ref={certificateRef}
                className="bg-gradient-to-br from-slate-50 to-sky-50 rounded-xl p-8 mb-6 border-4 border-maily relative"
              >
                {/* Borde decorativo interno */}
                <div className="absolute inset-2 border-2 border-maily-light rounded-lg pointer-events-none" />

                <div className="text-center relative">
                  {/* Logo */}
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-maily rounded-full flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Título */}
                  <h2 className="text-2xl font-bold text-gray-800 tracking-wide mb-2">
                    CERTIFICADO DE FINALIZACIÓN
                  </h2>

                  <p className="text-gray-500 mb-4">Este certificado se otorga a</p>

                  {/* Nombre */}
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedCertificate.userName}
                  </h3>

                  <div className="w-48 h-0.5 bg-maily mx-auto mb-4" />

                  <p className="text-gray-500 mb-2">por completar exitosamente</p>

                  {/* Módulo */}
                  <h4 className="text-xl font-semibold text-maily mb-2">
                    {selectedCertificate.moduleTitle}
                  </h4>

                  <p className="text-gray-600 mb-6">
                    del curso "{selectedCertificate.courseTitle}"
                  </p>

                  {/* Fecha y número */}
                  <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                    <div>
                      <p className="font-medium">Fecha de emisión</p>
                      <p>{formatDate(selectedCertificate.issuedAt)}</p>
                    </div>
                    <div>
                      <p className="font-medium">No. de certificado</p>
                      <p>{selectedCertificate.certificateNumber}</p>
                    </div>
                  </div>

                  {/* Firma */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-maily font-semibold">Cursos Maily Te Cuida</p>
                    <p className="text-xs text-gray-400">Plataforma de aprendizaje</p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  icon={Download}
                  onClick={() => handleDownload(selectedCertificate)}
                >
                  Descargar certificado
                </Button>
                <Button
                  variant="secondary"
                  icon={Share2}
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Mi certificado',
                        text: `¡Completé ${selectedCertificate.moduleTitle} en Cursos Maily Te Cuida!`,
                        url: window.location.href
                      });
                    }
                  }}
                >
                  Compartir
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Certificates;
