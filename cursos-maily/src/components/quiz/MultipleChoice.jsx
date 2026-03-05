import { motion } from 'framer-motion';

/**
 * Opción múltiple. value = índice seleccionado (number).
 */
export default function MultipleChoice({ question, value, onChange, disabled }) {
  const options = question.options || [];
  const selected = value != null ? Number(value) : null;

  return (
    <div className="space-y-3">
      {(options || []).map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => !disabled && onChange(i)}
          disabled={disabled}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
            selected === i
              ? 'border-maily bg-maily/5 text-maily'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                selected === i ? 'border-maily bg-maily text-white' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {String.fromCharCode(65 + i)}
            </div>
            <span className="text-sm font-medium">
              {typeof opt === 'string' ? opt : opt?.text ?? ''}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
