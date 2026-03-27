import { useState } from 'react';

/**
 * Relacionar columnas. value = { left_id: right_id }.
 * config: { pairs: [ { id, left, right } ] } — id es el identificador del par (izq y der comparten id en la respuesta correcta).
 * Accesibilidad WCAG 2.1 AA: role="group", aria-labelledby, aria-required en selects.
 */
export default function Matching({ question, value, onChange, disabled }) {
  const config = question.config || {};
  const pairs = config.pairs || [];
  const [matches, setMatches] = useState(() => (typeof value === 'object' && value !== null ? { ...value } : {}));
  const grupId = `matching-group-${question.id}`;
  const instruccionesId = `matching-instrucciones-${question.id}`;

  const rightOptions = pairs.map((p) => ({ id: p.id, label: p.right }));

  const handleSelect = (leftId, rightId) => {
    if (disabled) return;
    const next = { ...matches, [leftId]: rightId === '' ? undefined : Number(rightId) };
    setMatches(next);
    onChange(next);
  };

  if (!pairs.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No hay pares para relacionar.</p>;
  }

  return (
    <div
      role="group"
      aria-labelledby={grupId}
      aria-describedby={instruccionesId}
    >
      {/* ID oculto para aria-labelledby */}
      <span id={grupId} className="sr-only">{question.text}</span>

      <div className="space-y-3">
        <p id={instruccionesId} className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Elige la opción de la derecha que corresponde a cada elemento de la izquierda.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            {pairs.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <span
                  id={`matching-left-${question.id}-${p.id}`}
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  {p.left}
                </span>
                <div className="mt-2">
                  <label
                    htmlFor={`matching-select-${question.id}-${p.id}`}
                    className="sr-only"
                  >
                    Relacionar "{p.left}" con:
                  </label>
                  <select
                    id={`matching-select-${question.id}-${p.id}`}
                    aria-labelledby={`matching-left-${question.id}-${p.id}`}
                    aria-required="true"
                    value={matches[p.id] != null ? matches[p.id] : ''}
                    onChange={(e) => handleSelect(p.id, e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">— Seleccionar —</option>
                    {rightOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
