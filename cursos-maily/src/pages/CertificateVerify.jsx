import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Award, CheckCircle, XCircle, Calendar, BookOpen, User } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const CertificateVerify = () => {
  const { code } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/certificates/verify/${code}/`)
      .then((res) => setCert(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={40} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Certificado no válido</h1>
          <p className="text-gray-500 mb-6">
            No encontramos ningún certificado con el código:<br />
            <span className="font-mono text-sm text-gray-700 break-all">{code}</span>
          </p>
          <Link
            to="/"
            className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ir a Maily Academia
          </Link>
        </div>
      </div>
    );
  }

  const issuedDate = new Date(cert.issued_at).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Badge válido */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">
            <CheckCircle size={16} />
            Certificado verificado y válido
          </div>
        </div>

        {/* Tarjeta del certificado */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header azul */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={40} className="text-yellow-300" />
            </div>
            <p className="text-blue-200 text-sm font-medium tracking-widest uppercase mb-1">
              Maily Academia
            </p>
            <h1 className="text-2xl font-bold tracking-wide">Certificado de Finalización</h1>
          </div>

          {/* Cuerpo */}
          <div className="px-10 py-10 text-center">
            <p className="text-gray-500 text-sm mb-2">Este certificado acredita que</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{cert.user_name}</h2>

            <p className="text-gray-500 text-sm mb-2">completó satisfactoriamente el curso</p>
            <h3 className="text-xl font-semibold text-blue-700 mb-8">{cert.course_title}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <Calendar size={18} className="text-blue-500 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Fecha de emisión</p>
                  <p className="text-sm font-medium text-gray-800">{issuedDate}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <BookOpen size={18} className="text-blue-500 flex-shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Código de verificación</p>
                  <p className="text-xs font-mono font-medium text-gray-800 break-all">{cert.verification_code}</p>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-400">
                Este certificado fue emitido por{' '}
                <span className="font-semibold text-gray-600">Maily Academia</span> y puede ser
                verificado en cualquier momento usando el código único impreso.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <Link to="/" className="hover:text-blue-600 transition-colors">
            Visitar Maily Academia
          </Link>
        </p>
      </div>
    </div>
  );
};

export default CertificateVerify;
