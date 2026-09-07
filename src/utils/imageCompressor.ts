// Client-side Image Compression Engine for Tailgate Camera Proofs
export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
}

/**
 * Compress an image file/blob to max dimensions with JPEG quality reduction
 * @param file Input file from camera or file input
 * @param maxWidth Maximum width in px (default: 1200)
 * @param maxHeight Maximum height in px (default: 1200)
 * @param quality JPEG compression quality (default: 0.75)
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const hasCreateObjectURL = typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function';
    const objectUrl = hasCreateObjectURL ? URL.createObjectURL(file) : '';
    const img = new Image();

    function cleanup() {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }

    img.onload = () => {
      cleanup();
      let width = img.width;
      let height = img.height;

      // Maintain aspect ratio with bounding box scaling
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
        canvas.width = 0;
        canvas.height = 0;
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;
          if (blob) {
            resolve({
              blob,
              dataUrl,
              sizeBytes: blob.size
            });
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      reject(new Error('Image failed to load'));
    };

    if (hasCreateObjectURL) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('FileReader failed'));
      reader.readAsDataURL(file);
    }
  });
}
