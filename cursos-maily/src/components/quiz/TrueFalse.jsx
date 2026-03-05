/**
 * Pregunta Verdadero / Falso.
 * value = 0 (Verdadero) o 1 (Falso). Mismo formato que multiple_choice.
 */
export default function TrueFalse({ question, value, onChange, disabled }) {
  const options = ['Verdadero', 'Falso'];
  const selected = value === 0 || value === 1 ? value : null;

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {options.map((label, idx) => (
        <button
          key={idx}
          type="button"
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
  );
}
