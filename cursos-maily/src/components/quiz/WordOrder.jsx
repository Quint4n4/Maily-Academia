import { useState, useEffect, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Ordenar palabras/frases. value = array de índices en el orden elegido [2,0,1,3].
 * config: { items: ["A","B","C","D"] }. correct_order no se envía al alumno.
 * Accesibilidad WCAG 2.1 AA: role="group", aria-label en botones de flecha, aria-live.
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
  const grupId = `wordorder-group-${question.id}`;
  const instruccionesId = `wordorder-instrucciones-${question.id}`;

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
    <div
      role="group"
      aria-labelledby={grupId}
      aria-describedby={instruccionesId}
    >
      {/* ID oculto para aria-labelledby */}
      <span id={grupId} className="sr-only">{question.text}</span>

      <div className="space-y-2">
        <p id={instruccionesId} className="text-xs text-gray-500 dark:text-gray-400 mb-3">
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
                aria-label={`Mover "${items[itemIndex]}" hacia arriba, posición actual ${position + 1} de ${order.length}`}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronUp size={18} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(position, 1)}
                disabled={disabled || position === order.length - 1}
                aria-label={`Mover "${items[itemIndex]}" hacia abajo, posición actual ${position + 1} de ${order.length}`}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30"
              >
                <ChevronDown size={18} className="text-gray-600 dark:text-gray-300" aria-hidden="true" />
              </button>
            </div>
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
              {items[itemIndex]}
            </span>
            <span className="text-xs text-gray-400" aria-hidden="true">#{position + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
