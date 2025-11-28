import { useEffect, useState } from 'react';

/**
 * Runtime auto-cropping of transparent padding around small PNG icons.
 * It keeps the original artwork and only trims fully transparent edges.
 */
export const useAutoCroppedImage = (src: string): string => {
  const [croppedSrc, setCroppedSrc] = useState(src);

  useEffect(() => {
    if (typeof window === 'undefined' || !src) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const { data } = imageData;

      let top = height;
      let left = width;
      let right = 0;
      let bottom = 0;
      let hasOpaque = false;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 0) {
            hasOpaque = true;
            if (x < left) left = x;
            if (x > right) right = x;
            if (y < top) top = y;
            if (y > bottom) bottom = y;
          }
        }
      }

      if (!hasOpaque) {
        // Entire image is transparent, just keep original
        return;
      }

      const cropWidth = right - left + 1;
      const cropHeight = bottom - top + 1;

      const outCanvas = document.createElement('canvas');
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return;

      outCanvas.width = cropWidth;
      outCanvas.height = cropHeight;
      outCtx.drawImage(
        canvas,
        left,
        top,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const url = outCanvas.toDataURL('image/png');
      setCroppedSrc(url);
    };

    img.onerror = () => {
      if (!cancelled) {
        setCroppedSrc(src);
      }
    };

    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return croppedSrc;
};
