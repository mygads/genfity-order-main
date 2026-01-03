/**
 * Image Compression Service
 * 
 * Provides client-side image compression and optimization
 * for consistent image sizes across merchant and admin uploads
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  outputFormat?: 'jpeg' | 'webp' | 'png';
}

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

// Default compression settings for different use cases
export const COMPRESSION_PRESETS = {
  menuImage: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.85,
    outputFormat: 'webp' as const,
  },
  stockPhoto: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.9,
    outputFormat: 'webp' as const,
  },
  thumbnail: {
    maxWidth: 300,
    maxHeight: 300,
    quality: 0.8,
    outputFormat: 'webp' as const,
  },
  merchantLogo: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.9,
    outputFormat: 'webp' as const,
  },
  merchantBanner: {
    maxWidth: 1920,
    maxHeight: 600,
    quality: 0.85,
    outputFormat: 'webp' as const,
  },
};

/**
 * Compress and optimize an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    outputFormat = 'webp',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Round dimensions to even numbers (better for video codecs)
        width = Math.round(width / 2) * 2;
        height = Math.round(height / 2) * 2;

        // Create canvas for compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        const mimeType = `image/${outputFormat}`;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            resolve({
              blob,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size,
              compressionRatio: Math.round((1 - blob.size / file.size) * 100),
            });
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Create a thumbnail from an image file
 */
export async function createThumbnail(
  file: File,
  size: number = 300
): Promise<Blob> {
  const result = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    outputFormat: 'webp',
  });
  return result.blob;
}

/**
 * Compress image for menu items
 */
export async function compressMenuImage(file: File): Promise<CompressionResult> {
  return compressImage(file, COMPRESSION_PRESETS.menuImage);
}

/**
 * Compress image for stock photos
 */
export async function compressStockPhoto(file: File): Promise<CompressionResult> {
  return compressImage(file, COMPRESSION_PRESETS.stockPhoto);
}

/**
 * Compress image for merchant logo
 */
export async function compressMerchantLogo(file: File): Promise<CompressionResult> {
  return compressImage(file, COMPRESSION_PRESETS.merchantLogo);
}

/**
 * Compress image for merchant banner
 */
export async function compressMerchantBanner(file: File): Promise<CompressionResult> {
  return compressImage(file, COMPRESSION_PRESETS.merchantBanner);
}

/**
 * Convert File to compressed File object
 */
export async function compressToFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const result = await compressImage(file, options);
  const extension = options.outputFormat || 'webp';
  const newFileName = file.name.replace(/\.[^.]+$/, `.${extension}`);
  
  return new File([result.blob], newFileName, {
    type: `image/${extension}`,
    lastModified: Date.now(),
  });
}

/**
 * Check if browser supports WebP
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}
