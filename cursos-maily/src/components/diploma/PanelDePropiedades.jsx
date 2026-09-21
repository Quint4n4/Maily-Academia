import { Trash2 } from 'lucide-react';

import { CAMPOS, FUENTES, PAGINA, TIPOS } from './utilidades';

const etiqueta = 'block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1';
const control =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 ' +
  'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

/**
 * Propiedades del elemento seleccionado.
 *
 * Los numeros se escriben en milimetros porque es lo que se guarda. Mostrar
 * pixeles obligaria a traducir en los dos sentidos y a que el maestro viera un
 * numero distinto segun el tamano de su pantalla.
 */
const PanelDePropiedades = ({ elemento, onCambiar, onBorrar, errores = [], recursos = [] }) => {
  if (!elemento) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
        Selecciona un elemento del diploma para editarlo.
      </div>
    );
  }

  const cambiar = (campo, valor) => onCambiar({ ...elemento, [campo]: valor });
  const numero = (campo, valor) => cambiar(campo, valor === '' ? 0 : Number(valor));
  const esTexto = elemento.tipo === 'campo' || elemento.tipo === 'texto';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {TIPOS[elemento.tipo] ?? elemento.tipo}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{elemento.id}</p>
        </div>
        {elemento.bloqueado ? (
          <span
            className="rounded bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            title="Sin el código de verificación el diploma no se puede comprobar"
          >
            No se puede borrar
          </span>
        ) : (
          <button
            type="button"
            onClick={onBorrar}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
          >
            <Trash2 size={14} /> Quitar
          </button>
        )}
      </div>

      {errores.length > 0 && (
        <ul className="space-y-1 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {errores.map((mensaje) => <li key={mensaje}>{mensaje}</li>)}
        </ul>
      )}

      {elemento.tipo === 'campo' && (
        <div>
          <label className={etiqueta}>Qué variable imprime</label>
          <select
            className={control}
            value={elemento.campo ?? 'alumno'}
            onChange={(e) => cambiar('campo', e.target.value)}
          >
            {Object.entries(CAMPOS).map(([clave, texto]) => (
              <option key={clave} value={clave}>{texto}</option>
            ))}
          </select>
        </div>
      )}

      {elemento.tipo === 'texto' && (
        <div>
          <label className={etiqueta}>Texto</label>
          <textarea
            className={control}
            rows={3}
            maxLength={300}
            value={elemento.contenido ?? ''}
            onChange={(e) => cambiar('contenido', e.target.value)}
          />
          <p className="mt-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
            Puedes insertar variables entre llaves:{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{alumno}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{curso}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{maestro}'}</code>{' '}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">{'{academia}'}</code>
          </p>
        </div>
      )}

      {elemento.tipo === 'sello' && (
        <div>
          <label className={etiqueta}>Texto del sello</label>
          <input
            className={control}
            value={elemento.contenido ?? ''}
            maxLength={8}
            onChange={(e) => cambiar('contenido', e.target.value)}
          />
        </div>
      )}

      {elemento.tipo === 'imagen' && (
        <div>
          <label className={etiqueta}>Imagen de la galería</label>
          <select
            className={control}
            value={elemento.recurso_id ?? ''}
            onChange={(e) => cambiar('recurso_id', e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Elige una —</option>
            {recursos.map((recurso) => (
              <option key={recurso.id} value={recurso.id}>
                {recurso.nombre} ({recurso.tipo})
              </option>
            ))}
          </select>
        </div>
      )}

      {esTexto && (
        <>
          <div>
            <label className={etiqueta}>Tipografía</label>
            <select
              className={control}
              value={elemento.fuente ?? 'sans'}
              onChange={(e) => cambiar('fuente', e.target.value)}
            >
              {Object.entries(FUENTES).map(([clave, fuente]) => (
                <option key={clave} value={clave}>{fuente.etiqueta}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiqueta}>Tamaño (pt)</label>
              <input
                type="number" min={5} max={80} step={0.5}
                className={control}
                value={elemento.tamano ?? 12}
                onChange={(e) => numero('tamano', e.target.value)}
              />
            </div>
            <div>
              <label className={etiqueta}>Color</label>
              <input
                type="color"
                className="h-[34px] w-full cursor-pointer rounded-md border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
                value={elemento.color ?? '#000000'}
                onChange={(e) => cambiar('color', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={etiqueta}>Alineación</label>
            <div className="flex gap-1">
              {[['left', 'Izquierda'], ['center', 'Centro'], ['right', 'Derecha']].map(
                ([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => cambiar('align', valor)}
                    className={[
                      'flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition',
                      (elemento.align ?? 'left') === valor
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
                    ].join(' ')}
                  >
                    {texto}
                  </button>
                ),
              )}
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={Boolean(elemento.autoajuste)}
              onChange={(e) => cambiar('autoajuste', e.target.checked)}
            />
            <span>
              Encoger si no cabe
              <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                Un nombre muy largo baja de tamaño solo en vez de salirse del marco.
              </span>
            </span>
          </label>

          <div>
            <label className={etiqueta}>Máximo de renglones</label>
            <input
              type="number" min={1} max={4}
              className={control}
              value={elemento.max_lineas ?? 1}
              onChange={(e) => numero('max_lineas', e.target.value)}
            />
          </div>
        </>
      )}

      <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Posición en milímetros
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Izquierda (x)</label>
            <input
              type="number" step={0.5} min={0} max={PAGINA.ancho}
              className={control}
              value={elemento.x ?? 0}
              onChange={(e) => numero('x', e.target.value)}
            />
          </div>
          <div>
            <label className={etiqueta}>Arriba (y)</label>
            <input
              type="number" step={0.5} min={0} max={PAGINA.alto}
              className={control}
              value={elemento.y ?? 0}
              onChange={(e) => numero('y', e.target.value)}
            />
          </div>
          <div>
            <label className={etiqueta}>Ancho</label>
            <input
              type="number" step={0.5} min={1} max={PAGINA.ancho}
              className={control}
              value={elemento.ancho ?? 10}
              onChange={(e) => numero('ancho', e.target.value)}
            />
          </div>
          {elemento.tipo === 'imagen' && (
            <div>
              <label className={etiqueta}>Alto</label>
              <input
                type="number" step={0.5} min={1} max={PAGINA.alto}
                className={control}
                value={elemento.alto ?? 10}
                onChange={(e) => numero('alto', e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelDePropiedades;
