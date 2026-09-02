import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, AlertCircle, CheckCircle, Shield, Tag, X } from 'lucide-react';
import { Modal, Button } from './ui';
import { createPaymentIntent, getStripeConfig, validateCoupon } from '../services/paymentService';

let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    const config = await getStripeConfig();
    stripePromise = loadStripe(config.publishable_key);
  }
  return stripePromise;
};

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: { color: '#ef4444' },
  },
  hidePostalCode: true,
};

/* ---------- Inner form (needs Stripe context) ---------- */

const CheckoutForm = ({ courseId, courseTitle, price, currency, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  // Estado del cupón
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [couponData, setCouponData] = useState(null); // { discount_amount, final_price, description } | { reason }

  const currencySymbol = currency === 'mxn' ? 'MXN $' : '$';

  // Precio a mostrar en el botón (original o con descuento)
  const displayPrice = couponStatus === 'valid' && couponData?.final_price != null
    ? couponData.final_price
    : price;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('validating');
    try {
      const res = await validateCoupon(couponCode.trim(), courseId);
      if (res.data.valid) {
        setCouponStatus('valid');
        setCouponData(res.data);
      } else {
        setCouponStatus('invalid');
        setCouponData({ reason: res.data.reason });
      }
    } catch {
      setCouponStatus('invalid');
      setCouponData({ reason: 'Error al validar el cupón' });
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponStatus(null);
    setCouponData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      // 1. Crear PaymentIntent en el backend (con cupón si aplica)
      const { client_secret } = await createPaymentIntent(
        courseId,
        couponStatus === 'valid' ? couponCode.trim() : null
      );

      // 2. Confirmar el pago con Stripe.js (maneja 3D Secure automáticamente)
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        client_secret,
        { payment_method: { card: elements.getElement(CardElement) } },
      );

      if (stripeError) {
        setError(stripeError.message || 'Error al procesar el pago.');
      } else if (paymentIntent.status === 'succeeded') {
        setSucceeded(true);
        // El webhook de Stripe creará el enrollment, pero lo hacemos optimista
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al iniciar el pago. Intenta de nuevo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (succeeded) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Pago exitoso</h3>
        <p className="text-gray-600 dark:text-gray-300">
          Ya estás inscrito en <strong>{courseTitle}</strong>. Redirigiendo...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Resumen del curso */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
        <p className="font-medium text-gray-900 dark:text-white">{courseTitle}</p>
        {couponStatus === 'valid' ? (
          <p className="text-xl font-bold text-maily mt-1 line-through text-gray-400 dark:text-gray-500 text-base">
            {currencySymbol}{Number(price).toFixed(2)}
          </p>
        ) : (
          <p className="text-xl font-bold text-maily mt-1">
            {currencySymbol}{Number(price).toFixed(2)}
          </p>
        )}
        {couponStatus === 'valid' && couponData?.final_price != null && (
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-0.5">
            {currencySymbol}{Number(couponData.final_price).toFixed(2)}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Campo de cupón de descuento */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Cupón de descuento
        </label>
        {couponStatus === 'valid' ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <Tag size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300 flex-1">
              {couponCode}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
              aria-label="Eliminar cupón"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleValidateCoupon())}
              placeholder="Ej: PROMO20"
              maxLength={30}
              className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-maily focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleValidateCoupon}
              disabled={!couponCode.trim() || couponStatus === 'validating'}
              className="px-4 py-2 text-sm font-medium rounded-md bg-maily text-white hover:bg-maily/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {couponStatus === 'validating' ? 'Validando...' : 'Aplicar'}
            </button>
          </div>
        )}

        {/* Feedback del cupón */}
        {couponStatus === 'valid' && couponData && (
          <div className="mt-2 text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
            <CheckCircle size={14} />
            {couponData.description} — Ahorro: {currencySymbol}{Number(couponData.discount_amount).toFixed(2)}
          </div>
        )}
        {couponStatus === 'invalid' && (
          <div className="mt-2 text-red-500 dark:text-red-400 text-sm flex items-center gap-1">
            <AlertCircle size={14} />
            {couponData?.reason || 'Cupón inválido'}
          </div>
        )}
      </div>

      {/* Resumen de precio con descuento */}
      {couponStatus === 'valid' && couponData && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-lg p-3 mb-4 text-sm">
          <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span>Precio original:</span>
            <span>{currencySymbol}{Number(price).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600 dark:text-green-400 mb-1">
            <span>Descuento ({couponCode}):</span>
            <span>-{currencySymbol}{Number(couponData.discount_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-green-200 dark:border-green-800/50 mt-2 pt-2">
            <span>Total a pagar:</span>
            <span>{currencySymbol}{Number(couponData.final_price).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Datos de la tarjeta */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Datos de la tarjeta
        </label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          disabled={!stripe || loading}
          className="flex-1"
          icon={<CreditCard size={18} />}
        >
          Pagar {currencySymbol}{Number(displayPrice).toFixed(2)}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <Shield size={14} />
        <span>Pago seguro procesado por Stripe</span>
      </div>
    </form>
  );
};

/* ---------- Main modal (loads Stripe) ---------- */

const PaymentModal = ({ isOpen, onClose, courseId, courseTitle, price, currency = 'mxn', onSuccess }) => {
  const [stripeInstance, setStripeInstance] = useState(null);
  const [loadingStripe, setLoadingStripe] = useState(false);

  useEffect(() => {
    if (isOpen && !stripeInstance) {
      setLoadingStripe(true);
      getStripe()
        .then(setStripeInstance)
        .catch(() => {})
        .finally(() => setLoadingStripe(false));
    }
  }, [isOpen, stripeInstance]);

  // Resetear instancia de Stripe al cerrar para que el estado del cupón se limpie al reabrir
  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pagar con tarjeta" size="md">
      {loadingStripe || !stripeInstance ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maily" />
        </div>
      ) : (
        // key={`${courseId}-${isOpen}`} fuerza re-mount de CheckoutForm al cambiar curso o reabrir modal,
        // limpiando así el estado del cupón automáticamente
        <Elements stripe={stripeInstance} key={`${courseId}-${isOpen}`}>
          <CheckoutForm
            courseId={courseId}
            courseTitle={courseTitle}
            price={price}
            currency={currency}
            onSuccess={onSuccess}
            onClose={handleClose}
          />
        </Elements>
      )}
    </Modal>
  );
};

export default PaymentModal;
