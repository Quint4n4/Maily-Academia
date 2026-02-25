import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Modal, Button } from './ui';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (err) => reject(err));
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop, mimeType = 'image/jpeg') {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, 0.9);
  });
}

export default function ImageCropModal({ isOpen, imageFile, onComplete, onCancel, aspect = 16 / 9 }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [applying, setApplying] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (imageFile && isOpen) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    setImageSrc(null);
  }, [imageFile, isOpen]);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setApplying(true);
    try {
      const mime = imageFile?.type?.startsWith('image/png') ? 'image/png' : 'image/jpeg';
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, mime);
      if (!blob) throw new Error('No blob');
      const ext = mime === 'image/png' ? 'png' : 'jpg';
      const file = new File([blob], `thumbnail.${ext}`, { type: mime });
      onComplete(file);
      handleClose();
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={true} onClose={handleClose} title="Recortar imagen del curso" size="lg" showClose={true}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Ajusta el área que se verá en la imagen del curso. Arrastra y usa la rueda para ampliar.
      </p>
      {imageSrc && (
        <div className="relative w-full h-[400px] bg-gray-900 rounded-xl overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{ containerStyle: { background: '#111' }, cropAreaStyle: { border: '2px solid white' } }}
          />
        </div>
      )}
      <div className="flex justify-end gap-3 mt-4">
        <Button type="button" variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleApply} loading={applying} disabled={!croppedAreaPixels}>
          Aplicar y subir
        </Button>
      </div>
    </Modal>
  );
}
