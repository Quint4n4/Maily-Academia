import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Download, ExternalLink, Receipt, ShoppingBag, Tag, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui';
import { SkeletonTableRow } from '../components/ui/SkeletonLoader';
import { getPaymentHistory, generateInvoice } from '../services/paymentService';
import { useToast } from '../context/ToastContext';

/* -----------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------- */

const STATUS_MAP = {
  COMPLETED: {
    label: 'Completado',
    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  },
  PENDING: {
    label: 'Pendiente',
    className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  },
  FAILED: {
    label: 'Fallido',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  },
  REFUND_REQUESTED: {
    label: 'Reembolso pendiente',
    className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  },
  REFUNDED: {
    label: 'Reembolsado',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAmount = (amount, currency = 'mxn') => {
  const symbol = currency === 'mxn' ? 'MXN $' : '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
};

/* -----------------------------------------------------------------------
   Componente principal
----------------------------------------------------------------------- */

const PaymentHistory = () => {
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await getPaymentHistory();
        const data = res.data;
        setPayments(Array.isArray(data) ? data : data?.results ?? []);
      } catch {
        showToast('No se pudo cargar el historial de pagos.', 'error');
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const handleDownloadInvoice = async (purchaseId) => {
    setDownloadingId(purchaseId);
    try {
      const response = await generateInvoice(purchaseId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `factura-${purchaseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Factura descargada correctamente.', 'success');
    } catch {
      showToast('Error al generar la factura. Intenta de nuevo.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  /* ---- Skeletons de carga ---- */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="animate-pulse h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {['Curso', 'Fecha', 'Monto', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTableRow key={i} cols={5} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ---- Empty state ---- */
  if (payments.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
          <CreditCard className="text-maily" size={28} />
          Mi Historial de Pagos
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-16 flex flex-col items-center justify-center text-center">
          <ShoppingBag size={52} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200 mb-2">
            No tienes compras registradas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            ¡Inscríbete a un curso y comienza tu camino de aprendizaje!
          </p>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 bg-maily text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-maily/90 transition-colors"
          >
            Ver catálogo de cursos
          </Link>
        </div>
      </div>
    );
  }

  /* ---- Vista principal ---- */
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <CreditCard className="text-maily" size={28} />
          Mi Historial de Pagos
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {payments.length} {payments.length === 1 ? 'compra' : 'compras'}
        </span>
      </div>

      {/* Tabla — desktop */}
      <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              {['Curso', 'Fecha', 'Monto', 'Estado', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {payments.map((p) => {
              const statusInfo = STATUS_MAP[p.status] ?? {
                label: p.status,
                className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
              };

              return (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  {/* Curso */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {p.course_thumbnail ? (
                        <img
                          src={p.course_thumbnail}
                          alt={p.course_title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Receipt size={20} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
                          {p.course_title || '—'}
                        </p>
                        {p.coupon_code && (
                          <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30">
                            <Tag size={9} />
                            Cupón: {p.coupon_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Fecha */}
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatDate(p.created_at)}
                  </td>

                  {/* Monto */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {formatAmount(p.amount, p.currency)}
                      </span>
                      {p.original_amount && Number(p.original_amount) !== Number(p.amount) && (
                        <p className="text-xs line-through text-gray-400 dark:text-gray-500">
                          {formatAmount(p.original_amount, p.currency)}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {p.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleDownloadInvoice(p.id)}
                          disabled={downloadingId === p.id}
                          title="Descargar recibo"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Download size={13} />
                          {downloadingId === p.id ? 'Descargando...' : 'Recibo'}
                        </button>
                      )}
                      {p.receipt_url && (
                        <a
                          href={p.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver recibo en Stripe"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        >
                          <ExternalLink size={13} />
                          Stripe
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="sm:hidden space-y-4">
        {payments.map((p) => {
          const statusInfo = STATUS_MAP[p.status] ?? {
            label: p.status,
            className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
          };

          return (
            <div
              key={p.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3"
            >
              {/* Cabecera del card */}
              <div className="flex items-start gap-3">
                {p.course_thumbnail ? (
                  <img
                    src={p.course_thumbnail}
                    alt={p.course_title}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-gray-100 dark:border-gray-700"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Receipt size={22} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                    {p.course_title || '—'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDate(p.created_at)}
                  </p>
                  {p.coupon_code && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/30">
                      <Tag size={9} />
                      Cupón: {p.coupon_code}
                    </span>
                  )}
                </div>
              </div>

              {/* Monto + Estado */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 dark:text-white text-base">
                    {formatAmount(p.amount, p.currency)}
                  </span>
                  {p.original_amount && Number(p.original_amount) !== Number(p.amount) && (
                    <span className="ml-2 text-xs line-through text-gray-400 dark:text-gray-500">
                      {formatAmount(p.original_amount, p.currency)}
                    </span>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Acciones */}
              {(p.status === 'COMPLETED' || p.receipt_url) && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                  {p.status === 'COMPLETED' && (
                    <button
                      onClick={() => handleDownloadInvoice(p.id)}
                      disabled={downloadingId === p.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Download size={13} />
                      {downloadingId === p.id ? 'Descargando...' : 'Descargar recibo'}
                    </button>
                  )}
                  {p.receipt_url && (
                    <a
                      href={p.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <ExternalLink size={13} />
                      Ver recibo Stripe
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentHistory;
