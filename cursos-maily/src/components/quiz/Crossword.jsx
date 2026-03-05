import { useState, useMemo } from 'react';

/**
 * Crucigrama. value = { "row_col": "letter" } ej. { "0_2": "C" }.
 * config: { words: [ { word, clue, start_row, start_col, direction } ] }
 */
export default function Crossword({ question, value, onChange, disabled }) {
  const config = question.config || {};
  const words = config.words || [];
  const [cells, setCells] = useState(() => (typeof value === 'object' && value !== null ? { ...value } : {}));

  const { gridSize, cellMap } = useMemo(() => {
    let maxR = 0, maxC = 0;
    const cellMap = new Map();
    words.forEach((w) => {
      const word = (w.word || '').toUpperCase();
      const sr = int(w.start_row, 0);
      const sc = int(w.start_col, 0);
      const horizontal = (w.direction || 'horizontal').toLowerCase() === 'horizontal';
      for (let i = 0; i < word.length; i++) {
        const r = horizontal ? sr : sr + i;
        const c = horizontal ? sc + i : sc;
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
        cellMap.set(`${r}_${c}`, { letter: word[i], clue: w.clue, wordIndex: w.word });
      }
    });
    return { gridSize: { rows: maxR + 1, cols: maxC + 1 }, cellMap };
  }, [words]);

  function int(x, def) {
    const n = parseInt(x, 10);
    return Number.isNaN(n) ? def : n;
  }

  const clues = words.filter((w) => w.clue).map((w, i) => ({ num: i + 1, clue: w.clue, word: w.word }));

  const handleCellChange = (key, letter) => {
    if (disabled) return;
    const next = { ...cells };
    const one = (letter || '').toUpperCase().slice(0, 1);
    if (one) next[key] = one;
    else delete next[key];
    setCells(next);
    onChange(next);
  };

  const rows = gridSize.rows || 1;
  const cols = gridSize.cols || 1;

  return (
    <div className="space-y-4">
      {clues.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Pistas:</p>
          <ul className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {clues.map((c, i) => (
              <li key={i}>{c.clue}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-0.5"
          style={{ gridTemplateColumns: `repeat(${cols}, 2rem)`, gridTemplateRows: `repeat(${rows}, 2rem)` }}
        >
          {Array.from({ length: rows * cols }, (_, i) => {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const key = `${r}_${c}`;
            const info = cellMap.get(key);
            if (!info) return <div key={key} className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded" />;
            return (
              <input
                key={key}
                type="text"
                maxLength={1}
                value={cells[key] || ''}
                onChange={(e) => handleCellChange(key, e.target.value)}
                disabled={disabled}
                className="w-8 h-8 text-center text-sm font-bold border border-gray-400 dark:border-gray-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
