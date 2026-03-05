import { useState } from 'react';

/**
 * Llenar espacios. value = { blank_id: "texto" }.
 * config: { text: "La {{1}} es...", blanks: [ { id: 1, hint: "..." } ] } (correct_answers no se envía al alumno).
 */
export default function FillBlank({ question, value, onChange, disabled }) {
  const config = question.config || {};
  const text = config.text || '';
  const blanks = config.blanks || [];
  const [answers, setAnswers] = useState(() => (typeof value === 'object' && value !== null ? { ...value } : {}));

  const handleBlankChange = (id, v) => {
    if (disabled) return;
    const next = { ...answers, [id]: v };
    setAnswers(next);
    onChange(next);
  };

  const parts = [];
  let remaining = text;
  const re = /\{\{(\d+)\}\}/g;
  let m;
  let lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    parts.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    parts.push({ type: 'blank', id: Number(m[1]) });
    lastIndex = re.lastIndex;
  }
  parts.push({ type: 'text', value: text.slice(lastIndex) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-2 text-gray-900 dark:text-white">
        {parts.map((part, i) =>
          part.type === 'text' ? (
            <span key={i}>{part.value}</span>
          ) : (
            <span key={i} className="inline-flex items-center gap-1">
              <input
                type="text"
                value={answers[part.id] ?? ''}
                onChange={(e) => handleBlankChange(part.id, e.target.value.trim())}
                disabled={disabled}
                placeholder={blanks.find((b) => b.id === part.id)?.hint || '...'}
                className="px-2 py-1 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 min-w-[120px] text-center"
              />
            </span>
          )
        )}
      </div>
    </div>
  );
}
