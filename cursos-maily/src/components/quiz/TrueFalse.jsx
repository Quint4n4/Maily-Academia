/**
 * Pregunta Verdadero / Falso.
 * value = 0 (Verdadero) o 1 (Falso). Mismo formato que multiple_choice.
 * Accesibilidad WCAG 2.1 AA: role="group", aria-labelledby, aria-checked, aria-required.
 */
export default function TrueFalse({ question, value, onChange, disabled }) {
  const options = ['Verdadero', 'Falso'];
  const selected = value === 0 || value === 1 ? value : null;
  const grupId = `tf-group-${question.id}`;
  const instruccionesId = `tf-instrucciones-${question.id}`;

  return (
    <div
      role="group"
      aria-labelledby={grupId}
      aria-describedby={instruccionesId}
    >
      {/* ID oculto para aria-labelledby: apunta al texto de la pregunta */}
      <span id={grupId} className="sr-only">{question.text}</span>
      <span id={instruccionesId} className="sr-only">
        Selecciona Verdadero o Falso. Pregunta de verdadero o falso.
      </span>

      <div className="flex flex-col sm:flex-row gap-4" aria-required="true">
        {options.map((label, idx) => (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={selected === idx}
            aria-label={`${label}${selected === idx ? ', seleccionado' : ''}`}
            onClick={() => !disabled && onChange(idx)}
            disabled={disabled}
            className={`
              flex-1 py-4 px-6 rounded-xl border-2 text-lg font-semibold transition-all
              ${selected === idx
                ? 'border-maily bg-maily/10 text-maily'
                : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-maily/50'
              }
              ${disabled ? 'opacity-70 cursor-default' : 'cursor-pointer'}
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
