import { useState } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';
import { Modal, Button, Input } from './ui';

const formatCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  const digits = v.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
};

const PaymentModal = ({ isOpen, onClose, courseTitle, price, onSuccess, onError }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCardNumberChange = (e) => {
    setCardNumber(formatCardNumber(e.target.value));
  };
  const handleExpiryChange = (e) => {
    setExpiry(formatExpiry(e.target.value));
  };
  const handleCvvChange = (e) => {
    setCvv(e.target.value.replace(/\D/g, '').slice(0, 4));
  };

  const reset = () => {
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardHolder('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const rawNumber = cardNumber.replace(/\s/g, '');
    if (rawNumber.length !== 16) {
      setError('El número de tarjeta debe tener 16 dígitos.');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError('Formato de vencimiento inválido (MM/YY).');
      return;
    }
    if (cvv.length < 3) {
      setError('El CVV debe tener 3 o 4 dígitos.');
      return;
    }
    if (cardHolder.trim().length < 2) {
      setError('Introduce el nombre del titular.');
      return;
    }
    setLoading(true);
    try {
      await onSuccess({
        card_number: rawNumber,
        expiry,
        cvv,
        card_holder: cardHolder.trim(),
      });
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al procesar el pago. Intenta de nuevo.';
      setError(msg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pagar con tarjeta" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
          <p className="font-medium text-gray-900 dark:text-white">{courseTitle}</p>
          <p className="text-xl font-bold text-maily mt-1">${Number(price).toFixed(2)} USD</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <Input
          label="Número de tarjeta"
          placeholder="1234 5678 9012 3456"
          value={cardNumber}
          onChange={handleCardNumberChange}
          maxLength={19}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Vencimiento (MM/YY)"
            placeholder="12/28"
            value={expiry}
            onChange={handleExpiryChange}
            maxLength={5}
          />
          <Input
            label="CVV"
            placeholder="123"
            type="password"
            value={cvv}
            onChange={handleCvvChange}
            maxLength={4}
          />
        </div>
        <Input
          label="Nombre del titular"
          placeholder="Como aparece en la tarjeta"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
        />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" loading={loading} className="flex-1" icon={<CreditCard size={18} />}>
            Pagar ${Number(price).toFixed(2)}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Simulación de pago. No se realizará ningún cargo real.
        </p>
      </form>
    </Modal>
  );
};

export default PaymentModal;
