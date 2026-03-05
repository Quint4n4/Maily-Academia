import { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Ordenar palabras/frases. value = array de índices en el orden elegido [2,0,1,3].
 * config: { items: ["A","B","C","D"] }. correct_order no se envía al alumno.
 */
function normalizeItems(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(/[\n,/]+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export default function WordOrder({ question, value, onChange, disabled }) {
  const config = question.config || {};
  const items = useMemo(() => normalizeItems(config.items), [config.items]);
  const [order, setOrder] = useState(() => {
    if (Array.isArray(value) && value.length === items.length) return value;
    return items.map((_, i) => i);
  });

  useEffect(() => {
    if (items.length && order.length === items.length) {
      onChange(order);
    }
  }, [order, items.length]);

  const move = (index, direction) => {
    if (disabled) return;
    const newOrder = [...order];
    const swap = index + direction;
    if (swap < 0 || swap >= newOrder.length) return;
    [newOrder[index], newOrder[swap]] = [newOrder[swap], newOrder[index]];
    setOrder(newOrder);
  };

  if (!items.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No hay elementos para ordenar.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Usa las flechas para ordenar de arriba a abajo en el orden correcto.
      </p>
      {order.map((itemIndex, position) => (
        <div
          key={`${position}-${itemIndex}`}
          className="flex items-center gap-2 p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
        >
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => move(position, -1)}
              disabled={disabled || position === 0}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronUp size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button
              type="button"
              onClick={() => move(position, 1)}
              disabled={disabled || position === order.length - 1}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
            >
              <ChevronDown size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
          <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
            {items[itemIndex]}
          </span>
          <span className="text-xs text-gray-400">#{position + 1}</span>
        </div>
      ))}
    </div>
  );
}
