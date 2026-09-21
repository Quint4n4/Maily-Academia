import { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';

import {
  PAGINA,
  altoEnMm,
  estiloDeTexto,
  textoDe,
} from './utilidades';

/**
 * El lienzo del editor: una hoja A4 horizontal donde se arrastran los elementos.
 *
 * **Es una aproximacion, no el diploma.** El navegador mide el texto distinto a
 * ReportLab, asi que lo que se ve aqui sirve para COLOCAR; la verdad la dice el
 * boton de vista previa, que pide el PDF al mismo codigo que emitira el
 * diploma. Por eso no se intenta clavar el renderizado: se intenta que el sitio
 * donde sueltas sea el sitio donde queda.
 */
const Lienzo = ({
  documento,
  seleccionado,
  onSeleccionar,
  onCambiar,
  errores = {},
  recursosPorId = {},
}) => {
  const contenedor = useRef(null);
  const [anchoPx, setAnchoPx] = useState(0);

  // La escala depende del ancho disponible, asi que se recalcula al cambiar el
  // tamano de la ventana. Sin esto, arrastrar despues de redimensionar deja el
  // elemento donde no es.
  useEffect(() => {
    if (!contenedor.current) return undefined;
    const observador = new ResizeObserver((entradas) => {
      setAnchoPx(entradas[0].contentRect.width);
    });
    observador.observe(contenedor.current);
    return () => observador.disconnect();
  }, []);

  const escala = anchoPx / PAGINA.ancho;
  const altoPx = PAGINA.alto * escala;

  const actualizar = (id, cambios) => {
    onCambiar(
      documento.elementos.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
    );
  };

  const fondo = documento.fondo?.recurso_id
    ? recursosPorId[documento.fondo.recurso_id]
    : null;

  return (
    <div ref={contenedor} className="w-full">
      <div
        className="relative mx-auto overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-300 dark:ring-gray-600"
        style={{ width: anchoPx || '100%', height: altoPx || 'auto' }}
      >
        {fondo ? (
          <img
            src={fondo.url}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // El marco que dibuja el servidor cuando no hay imagen de fondo.
          <>
            <div
              className="pointer-events-none absolute border-[3px] border-[#1e40af]"
              style={{
                left: 10 * escala, top: 10 * escala,
                width: (PAGINA.ancho - 20) * escala, height: (PAGINA.alto - 20) * escala,
              }}
            />
            <div
              className="pointer-events-none absolute border border-[#845400]"
              style={{
                left: 13 * escala, top: 13 * escala,
                width: (PAGINA.ancho - 26) * escala, height: (PAGINA.alto - 26) * escala,
              }}
            />
          </>
        )}

        {escala > 0 && documento.elementos.map((elemento) => {
          const alto = altoEnMm(elemento);
          const estaSeleccionado = seleccionado === elemento.id;
          const tieneError = Boolean(errores[elemento.id]);

          return (
            <Rnd
              key={elemento.id}
              bounds="parent"
              size={{ width: elemento.ancho * escala, height: alto * escala }}
              position={{ x: elemento.x * escala, y: elemento.y * escala }}
              onDragStart={() => onSeleccionar(elemento.id)}
              onDragStop={(evento, datos) => {
                const x = Number((datos.x / escala).toFixed(2));
                const y = Number((datos.y / escala).toFixed(2));
                // Un clic sin arrastrar tambien dispara onDragStop. Sin esta
                // comparacion, seleccionar un elemento marcaba el diploma como
                // "sin guardar" y el boton de deshacer se encendia sin que
                // nadie hubiera cambiado nada.
                if (x === elemento.x && y === elemento.y) return;
                actualizar(elemento.id, { x, y });
              }}
              onResizeStop={(evento, direccion, ref, delta, posicion) => {
                const anchoMm = Number((ref.offsetWidth / escala).toFixed(2));
                const cambios = {
                  ancho: anchoMm,
                  x: Number((posicion.x / escala).toFixed(2)),
                  y: Number((posicion.y / escala).toFixed(2)),
                };
                // Solo la imagen guarda su alto: el de un texto lo decide la
                // fuente, y el del QR y el sello es su propio lado.
                if (elemento.tipo === 'imagen') {
                  cambios.alto = Number((ref.offsetHeight / escala).toFixed(2));
                }
                actualizar(elemento.id, cambios);
              }}
              enableResizing={{ left: true, right: true,
                top: elemento.tipo === 'imagen', bottom: elemento.tipo === 'imagen' }}
              className={[
                'group cursor-move',
                estaSeleccionado ? 'z-20' : 'z-10',
              ].join(' ')}
              onClick={() => onSeleccionar(elemento.id)}
            >
              <div
                className={[
                  'relative h-full w-full',
                  estaSeleccionado
                    ? 'outline outline-2 outline-blue-500'
                    : 'outline-dashed outline-1 outline-transparent group-hover:outline-blue-300',
                  tieneError ? 'outline outline-2 outline-red-500' : '',
                ].join(' ')}
                title={tieneError ? errores[elemento.id].join(' ') : undefined}
              >
                <ContenidoDelElemento
                  elemento={elemento}
                  escala={escala}
                  recurso={recursosPorId[elemento.recurso_id]}
                />
                {elemento.bloqueado && (
                  <span
                    className="pointer-events-none absolute -top-4 right-0 rounded bg-amber-500 px-1 text-[9px] font-semibold text-white"
                    title="No se puede borrar"
                  >
                    fijo
                  </span>
                )}
              </div>
            </Rnd>
          );
        })}
      </div>
    </div>
  );
};

const ContenidoDelElemento = ({ elemento, escala, recurso }) => {
  if (elemento.tipo === 'linea') {
    return (
      <div className="flex h-full w-full items-center">
        <div
          className="w-full"
          style={{
            borderTopWidth: Math.max(1, (elemento.grosor ?? 0.8) * escala * 0.35),
            borderColor: elemento.color ?? '#000000',
          }}
        />
      </div>
    );
  }

  if (elemento.tipo === 'qr') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-900/90 text-[8px] font-bold text-white">
        QR
      </div>
    );
  }

  if (elemento.tipo === 'sello') {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border-2 text-[10px] font-bold"
        style={{ borderColor: elemento.color ?? '#845400', color: elemento.color ?? '#845400' }}
      >
        {elemento.contenido ?? ''}
      </div>
    );
  }

  if (elemento.tipo === 'imagen') {
    if (!recurso) {
      return (
        <div className="flex h-full w-full items-center justify-center border border-dashed border-gray-400 bg-gray-100/70 text-[9px] text-gray-500">
          Sin imagen
        </div>
      );
    }
    return (
      <img
        src={recurso.url}
        alt={recurso.nombre}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  return (
    <div className="h-full w-full" style={estiloDeTexto(elemento, escala)}>
      {textoDe(elemento)}
    </div>
  );
};

export default Lienzo;
