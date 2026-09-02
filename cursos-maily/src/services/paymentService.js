import api from './api';

/**
 * Obtiene la publishable key de Stripe desde el backend.
 */
export const getStripeConfig = async () => {
  const { data } = await api.get('/payments/config/');
  return data;
};

/**
 * Crea un PaymentIntent y retorna el client_secret.
 * Opcionalmente acepta un código de cupón para aplicar descuento.
 */
export const createPaymentIntent = async (courseId, couponCode = null) => {
  const { data } = await api.post('/payments/create-intent/', {
    course_id: courseId,
    ...(couponCode && { coupon_code: couponCode }),
  });
  return data;
};

/**
 * Consulta el estado de una compra.
 */
export const getPaymentStatus = async (purchaseId) => {
  const { data } = await api.get(`/payments/${purchaseId}/status/`);
  return data;
};

/**
 * Valida un cupón de descuento para un curso específico.
 * Retorna { valid, discount_amount, final_price, description } o { valid: false, reason }
 */
export const validateCoupon = (code, courseId) =>
  api.post('/payments/coupons/validate/', { code, course_id: courseId });

/**
 * Obtiene el historial de pagos del alumno autenticado.
 */
export const getPaymentHistory = () =>
  api.get('/payments/history/');

/**
 * Genera y descarga la factura/recibo de una compra en formato PDF.
 */
export const generateInvoice = (purchaseId) =>
  api.post(`/payments/${purchaseId}/invoice/`, {}, { responseType: 'blob' });
