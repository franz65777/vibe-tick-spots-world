import { useEffect, useRef, useState } from 'react';

// Simple cache to avoid reprocessing the same image multiple times
const cache = new Map<string, string>();

function isLightNeutral(r: number, g: number, b: number) {
  // Detect near-grey/white pixels (checkerboard and white bg)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  // Neutral (low chroma) and fairly light
  return diff < 16 && max > 160; // removes light greys and whites without touching colored pixels
}

export function useTransparentImage(src?: string) {
  const [processed, setProcessed] = useState<string | null>(null);
  const working = useRef(false);

  useEffect(() => {
    if (!src) return;
    if (cache.has(src)) {
      setProcessed(cache.get(src)!);
      return;
    }
    if (working.current) return;
    working.current = true;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (isLightNeutral(r, g, b)) {
            data[i + 3] = 0; // transparent
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const url = canvas.toDataURL('image/png');
        cache.set(src, url);
        setProcessed(url);
      } catch (e) {
        console.warn('Transparency processing failed, falling back to original', e);
        setProcessed(null);
      } finally {
        working.current = false;
      }
    };
    img.onerror = () => {
      working.current = false;
      setProcessed(null);
    };
    img.src = src;
  }, [src]);

  return processed;
}
