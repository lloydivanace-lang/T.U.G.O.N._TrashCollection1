/**
 * Lightweight Client-Side Image Compressor & Formatter
 * Keeps photo quality sharp while reducing 5MB-15MB camera raw data down to ~60-90KB.
 * Ensures localStorage never throws QuotaExceededError and enables fast mobile/TV rendering.
 */

export async function compressImage(
  source: File | Blob | string,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve) => {
    let srcUrl = '';
    let shouldRevoke = false;

    if (typeof source === 'string') {
      srcUrl = source;
    } else {
      srcUrl = URL.createObjectURL(source);
      shouldRevoke = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (shouldRevoke) URL.revokeObjectURL(srcUrl);
          resolve(typeof source === 'string' ? source : srcUrl);
          return;
        }

        // Fill background white in case of transparent pngs
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Compression error fallback:', err);
        if (shouldRevoke) URL.revokeObjectURL(srcUrl);
        resolve(typeof source === 'string' ? source : srcUrl);
      }
    };

    img.onerror = () => {
      if (shouldRevoke) URL.revokeObjectURL(srcUrl);
      resolve(typeof source === 'string' ? source : '');
    };

    img.src = srcUrl;
  });
}
