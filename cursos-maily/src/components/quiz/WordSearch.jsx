import { useState, useMemo, useCallback } from 'react';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Genera una grilla de sopa de letras a partir de una lista de palabras.
 * Coloca cada palabra horizontal o verticalmente y rellena el resto con letras aleatorias.
 */
function buildGridFromWords(words, gridSize = 14) {
  const normalized = words.map((w) => String(w).toUpperCase().replace(/\s/g, ''));
  const grid = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(''));

  const directions = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal \
    [1, -1], // diagonal /
  ];

  for (const word of normalized) {
    if (!word || word.length > gridSize) continue;
    let placed = false;
    for (let attempt = 0; attempt < 50 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const maxRow = gridSize - (dir[0] * (word.length - 1)) - (dir[0] < 0 ? word.length : 0);
      const maxCol = gridSize - (dir[1] * (word.length - 1)) - (dir[1] < 0 ? word.length : 0);
      const r0 = Math.max(0, Math.floor(Math.random() * maxRow));
      const c0 = Math.max(0, Math.floor(Math.random() * maxCol));
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dir[0] * i;
        const c = c0 + dir[1] * i;
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) {
          ok = false;
          break;
        }
        const current = grid[r][c];
        if (current !== '' && current !== word[i]) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (let i = 0; i < word.length; i++) {
          grid[r0 + dir[0] * i][c0 + dir[1] * i] = word[i];
        }
        placed = true;
      }
    }
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }
  return grid;
}

/**
 * Dado un inicio y un fin (misma fila, misma columna o misma diagonal), devuelve la lista de celdas en línea.
 */
function getLineCells(r0, c0, r1, c1) {
  const cells = [];
  const dr = r1 - r0;
  const dc = c1 - c0;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) {
    return [{ r: r0, c: c0 }];
  }
  const sr = dr === 0 ? 0 : dr / Math.abs(dr);
  const sc = dc === 0 ? 0 : dc / Math.abs(dc);
  for (let i = 0; i <= steps; i++) {
    cells.push({ r: r0 + sr * i, c: c0 + sc * i });
  }
  return cells;
}

/**
 * Sopa de letras real: grilla interactiva donde el usuario selecciona celdas (arrastrar) para formar palabras.
 * value = array de palabras encontradas (strings en mayúsculas).
 * Accesibilidad WCAG 2.1 AA: aria-label en grilla, aria-live para palabras encontradas.
 */
export default function WordSearch({ question, value, onChange, disabled }) {
  const config = question.config || {};
  const wordsRaw = config.words_to_find || config.words || [];
  const wordsToFind = useMemo(() => {
    const normalize = (str) =>
      String(str)
        .split(/[/,\s]+/)
        .map((s) => s.toUpperCase().trim())
        .filter(Boolean);
    if (Array.isArray(wordsRaw)) return wordsRaw.flatMap((w) => normalize(w));
    if (typeof wordsRaw === 'string') return normalize(wordsRaw);
    return [];
  }, [wordsRaw]);

  const existingGrid = config.grid;
  const grid = useMemo(() => {
    if (existingGrid && Array.isArray(existingGrid) && existingGrid.length > 0) {
      return existingGrid.map((row) => (Array.isArray(row) ? row.map((c) => String(c || '').toUpperCase()) : []));
    }
    const maxWordLen = wordsToFind.length ? Math.max(...wordsToFind.map((w) => w.length)) : 0;
    const size = Math.min(18, Math.max(12, maxWordLen + 2));
    return buildGridFromWords(wordsToFind, size);
  }, [existingGrid, wordsToFind]);

  const [found, setFound] = useState(() => (Array.isArray(value) ? value.map((w) => String(w).toUpperCase()) : []));
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [highlightCells, setHighlightCells] = useState([]);

  const handleCellMouseDown = useCallback(
    (r, c) => {
      if (disabled) return;
      setSelecting(true);
      setStartCell({ r, c });
      setHighlightCells([{ r, c }]);
    },
    [disabled]
  );

  const handleCellMouseEnter = useCallback(
    (r, c) => {
      if (!selecting || !startCell || disabled) return;
      const line = getLineCells(startCell.r, startCell.c, r, c);
      setHighlightCells(line);
    },
    [selecting, startCell, disabled]
  );

  const handleCellMouseUp = useCallback(() => {
    if (!selecting || !startCell || highlightCells.length === 0) {
      setSelecting(false);
      setStartCell(null);
      setHighlightCells([]);
      return;
    }
    const word = highlightCells.map(({ r, c }) => grid[r] && grid[r][c]).join('');
    if (word && wordsToFind.includes(word) && !found.includes(word)) {
      const next = [...found, word];
      setFound(next);
      onChange(next);
    }
    setSelecting(false);
    setStartCell(null);
    setHighlightCells([]);
  }, [selecting, startCell, highlightCells, grid, wordsToFind, found, onChange]);

  const isHighlighted = useCallback(
    (r, c) => highlightCells.some((cell) => cell.r === r && cell.c === c),
    [highlightCells]
  );

  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const grupId = `wordsearch-group-${question.id}`;
  const instruccionesId = `wordsearch-instrucciones-${question.id}`;

  return (
    <div
      role="group"
      aria-labelledby={grupId}
      aria-describedby={instruccionesId}
    >
      {/* ID oculto para aria-labelledby */}
      <span id={grupId} className="sr-only">{question.text}</span>

      <div className="space-y-4">
        {wordsToFind.length > 0 && (
          <div className="space-y-2">
            <p id={instruccionesId} className="text-sm text-gray-600 dark:text-gray-400">
              Encuentra estas palabras en la sopa de letras (haz clic y arrastra sobre las letras):
            </p>
            <div className="flex flex-wrap gap-2" aria-label="Palabras a encontrar">
              {wordsToFind.map((w) => (
                <span
                  key={w}
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg font-medium text-sm border ${
                    found.includes(w)
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 line-through'
                      : 'bg-maily/10 text-maily dark:bg-maily/20 dark:text-maily-light border-maily/30'
                  }`}
                  aria-label={found.includes(w) ? `${w}, encontrada` : w}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Anuncio accesible de palabras encontradas */}
        <div
          aria-live="polite"
          aria-atomic="false"
          className="sr-only"
        >
          {found.length > 0 && `Palabras encontradas: ${found.join(', ')}. ${found.length} de ${wordsToFind.length}.`}
        </div>

        <div
          className="inline-block p-3 bg-gray-100 dark:bg-gray-800 rounded-xl select-none"
          role="application"
          aria-label={`Sopa de letras. ${found.length} de ${wordsToFind.length} palabras encontradas.`}
        >
          <div
            className="inline-grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            onMouseLeave={handleCellMouseUp}
            onMouseUp={handleCellMouseUp}
          >
            {grid.map((row, ri) =>
              row.map((letter, ci) => {
                const highlighted = isHighlighted(ri, ci);
                return (
                  <div
                    key={`${ri}-${ci}`}
                    onMouseDown={() => handleCellMouseDown(ri, ci)}
                    onMouseEnter={() => handleCellMouseEnter(ri, ci)}
                    aria-label={`Letra ${letter}, fila ${ri + 1}, columna ${ci + 1}`}
                    aria-selected={highlighted}
                    role="gridcell"
                    className={`
                      w-8 h-8 flex items-center justify-center border-2 font-mono font-bold text-sm cursor-pointer
                      transition-colors
                      ${highlighted ? 'bg-maily text-white border-maily' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-maily/50'}
                      ${disabled ? 'cursor-default opacity-80' : ''}
                    `}
                  >
                    {letter || ''}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {found.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Encontradas:</span>
            {found.map((w) => (
              <span
                key={w}
                className="inline-flex items-center px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-sm font-medium"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
