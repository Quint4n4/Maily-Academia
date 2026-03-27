import { motion } from 'framer-motion';

/**
 * Opción múltiple. value = índice seleccionado (number).
 * Accesibilidad WCAG 2.1 AA: role="group", aria-labelledby, aria-checked, aria-required.
 */
export default function MultipleChoice({ question, value, onChange, disabled }) {
  const options = question.options || [];
  const selected = value != null ? Number(value) : null;
  const grupId = `mc-group-${question.id}`;
  const instruccionesId = `mc-instrucciones-${question.id}`;

  return (
    <div
      role="group"
      aria-labelledby={grupId}
      aria-describedby={instruccionesId}
    >
      {/* ID oculto para aria-labelledby: apunta al texto de la pregunta */}
      <span id={grupId} className="sr-only">{question.text}</span>
      <span id={instruccionesId} className="sr-only">
        Selecciona una de las siguientes opciones. Pregunta de opción múltiple.
      </span>

      <div className="space-y-3" aria-required="true">
        {(options || []).map((opt, i) => {
          const estaSeleccionado = selected === i;
          const textoOpcion = typeof opt === 'string' ? opt : opt?.text ?? '';
          const letraOpcion = String.fromCharCode(65 + i);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={estaSeleccionado}
              aria-label={`Opción ${letraOpcion}: ${textoOpcion}`}
              onClick={() => !disabled && onChange(i)}
              disabled={disabled}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                estaSeleccionado
                  ? 'border-maily bg-maily/5 text-maily'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    estaSeleccionado ? 'border-maily bg-maily text-white' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  aria-hidden="true"
                >
                  {letraOpcion}
                </div>
                <span className="text-sm font-medium">
                  {textoOpcion}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
