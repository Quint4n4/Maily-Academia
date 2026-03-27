import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button } from './ui';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

/**
 * Renderiza al canvas la porción visible de la imagen según la posición y zoom actuales.
 * containerRef: ref al div del recuadro 16:9
 * imgElement: HTMLImageElement ya cargada
 * offset: {x, y} en px (desplazamiento desde el centro del container)
 * zoom: factor de escala sobre el "fit inicial"
 */
async function renderCrop({ imageSrc, containerSize, offset, zoom, outputWidth = 1280 }) {
  const img = await createImage(imageSrc);
  const { w: containerW, h: containerH } = containerSize;

  // Escala "fit" inicial: imagen contenida completamente en el container
  const fitScale = Math.min(containerW / img.width, containerH / img.height);
  const currentScale = fitScale * zoom;

  // Centro de la imagen en coordenadas del container
  const imgCenterX = containerW / 2 + offset.x;
  const imgCenterY = containerH / 2 + offset.y;

  // Esquina superior izquierda de la imagen en coordenadas del container
  const imgLeft = imgCenterX - (img.width * currentScale) / 2;
  const imgTop = imgCenterY - (img.height * currentScale) / 2;

  // Porción de la imagen original que está visible en el recuadro
  const sx = Math.max(0, -imgLeft / currentScale);
  const sy = Math.max(0, -imgTop / currentScale);
  const sWidth = Math.min(img.width - sx, containerW / currentScale);
  const sHeight = Math.min(img.height - sy, containerH / currentScale);

  // Coordenadas de destino en el canvas (por si la imagen es más pequeña que el recuadro)
  const dx = Math.max(0, imgLeft);
  const dy = Math.max(0, imgTop);
  const dWidth = sWidth * currentScale;
  const dHeight = sHeight * currentScale;

  const aspect = 16 / 9;
  const outputHeight = Math.round(outputWidth / aspect);

  const scaleToOutput = outputWidth / containerW;

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  // Fondo negro para zonas sin imagen
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  ctx.drawImage(
    img,
    sx, sy, sWidth, sHeight,
    dx * scaleToOutput, dy * scaleToOutput,
    dWidth * scaleToOutput, dHeight * scaleToOutput,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
  });
}

export default function ImageCropModal({ isOpen, imageFile, onComplete, onCancel, aspect = 16 / 9 }) {
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState(null); // { w, h }
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [applying, setApplying] = useState(false);

  const containerRef = useRef(null);
  const dragRef = useRef(null); // { startX, startY, startOffsetX, startOffsetY }
  const isTouchRef = useRef(false);
  const lastTouchDistRef = useRef(null);

  useEffect(() => {
    if (imageFile && isOpen) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      setOffset({ x: 0, y: 0 });
      setZoom(1);

      // Obtener dimensiones naturales para calcular límites
      const img = new Image();
      img.onload = () => setImgNaturalSize({ w: img.width, h: img.height });
      img.src = url;

      return () => URL.revokeObjectURL(url);
    }
    setImageSrc(null);
    setImgNaturalSize(null);
  }, [imageFile, isOpen]);

  // Límites de desplazamiento: la imagen no puede alejarse más de la mitad del container
  const clampOffset = useCallback((x, y, currentZoom) => {
    if (!containerRef.current || !imgNaturalSize) return { x, y };
    const containerW = containerRef.current.offsetWidth;
    const containerH = containerRef.current.offsetHeight;
    const fitScale = Math.min(containerW / imgNaturalSize.w, containerH / imgNaturalSize.h);
    const scale = fitScale * currentZoom;
    const imgDisplayW = imgNaturalSize.w * scale;
    const imgDisplayH = imgNaturalSize.h * scale;

    // Máximo desplazamiento: mitad de la diferencia entre imagen y container
    const maxX = Math.max(0, (imgDisplayW - containerW) / 2);
    const maxY = Math.max(0, (imgDisplayH - containerH) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }, [imgNaturalSize]);

  // ── Mouse drag ──
  const handleMouseDown = (e) => {
    e.preventDefault();
    isTouchRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current || isTouchRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newOffset = clampOffset(
        dragRef.current.startOffsetX + dx,
        dragRef.current.startOffsetY + dy,
        zoom,
      );
      setOffset(newOffset);
    };
    const handleMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [zoom, clampOffset]);

  // ── Touch drag + pinch zoom ──
  const handleTouchStart = (e) => {
    isTouchRef.current = true;
    if (e.touches.length === 1) {
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
      };
      lastTouchDistRef.current = null;
    } else if (e.touches.length === 2) {
      dragRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && dragRef.current) {
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      const newOffset = clampOffset(
        dragRef.current.startOffsetX + dx,
        dragRef.current.startOffsetY + dy,
        zoom,
      );
      setOffset(newOffset);
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastTouchDistRef.current;
      lastTouchDistRef.current = dist;
      setZoom((prev) => {
        const next = Math.max(1, Math.min(5, prev * delta));
        return next;
      });
    }
  };

  // ── Scroll para zoom con rueda del ratón ──
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    setZoom((prev) => {
      const next = Math.max(1, Math.min(5, prev * delta));
      setOffset((off) => clampOffset(off.x, off.y, next));
      return next;
    });
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    if (!imageSrc || !containerRef.current) return;
    setApplying(true);
    try {
      const containerSize = {
        w: containerRef.current.offsetWidth,
        h: containerRef.current.offsetHeight,
      };
      const blob = await renderCrop({ imageSrc, containerSize, offset, zoom });
      if (!blob) throw new Error('No blob');
      const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
      onComplete(file);
      onCancel();
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  if (!isOpen) return null;

  // Calcular el transform de la imagen para la preview
  const imgStyle = {
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
    transformOrigin: 'center center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    maxWidth: 'none',
    // Imagen contenida completamente con zoom 1
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'center',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title="Imagen del curso" size="lg" showClose={true}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Arrastra la imagen para reposicionarla. Usa la rueda del ratón o el deslizador para hacer zoom.
      </p>

      {/* Recuadro 16:9 interactivo */}
      {imageSrc && (
        <div
          ref={containerRef}
          className="w-full aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4 relative cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        >
          <img
            src={imageSrc}
            alt="Vista previa"
            style={imgStyle}
            draggable={false}
          />
          {/* Guías de los tercios (regla de los tercios) */}
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.15 }}>
            <div className="absolute top-1/3 left-0 right-0 border-t border-white" />
            <div className="absolute top-2/3 left-0 right-0 border-t border-white" />
            <div className="absolute left-1/3 top-0 bottom-0 border-l border-white" />
            <div className="absolute left-2/3 top-0 bottom-0 border-l border-white" />
          </div>
        </div>
      )}

      {/* Controles de zoom */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-8">1×</span>
        <input
          type="range"
          min={100}
          max={500}
          step={1}
          value={Math.round(zoom * 100)}
          onChange={(e) => {
            const next = Number(e.target.value) / 100;
            setZoom(next);
            setOffset((off) => clampOffset(off.x, off.y, next));
          }}
          className="flex-1 accent-indigo-600"
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 w-8">5×</span>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
          {zoom.toFixed(1)}×
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
        >
          Resetear
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleApply} loading={applying}>
          Aplicar y subir
        </Button>
      </div>
    </Modal>
  );
}
