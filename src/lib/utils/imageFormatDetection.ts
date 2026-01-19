/**
 * Image Format Detection & Optimization Utilities
 * 
 * Provides automatic image format detection and selection
 * for optimal browser compatibility and performance
 */

// Supported image formats
export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png' | 'gif' | 'svg';

// Format support detection cache
const formatSupportCache: Record<ImageFormat, boolean | null> = {
  webp: null,
  avif: null,
  jpeg: true, // Always supported
  png: true,  // Always supported
  gif: true,  // Always supported
  svg: true,  // Always supported
};

/**
 * Check if browser supports WebP format
 */
export async function supportsWebP(): Promise<boolean> {
  if (formatSupportCache.webp !== null) {
    return formatSupportCache.webp;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const result = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    formatSupportCache.webp = result;
    return result;
  } catch {
    formatSupportCache.webp = false;
    return false;
  }
}

/**
 * Check if browser supports AVIF format
 */
export async function supportsAVIF(): Promise<boolean> {
  if (formatSupportCache.avif !== null) {
    return formatSupportCache.avif;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const result = img.width > 0 && img.height > 0;
      formatSupportCache.avif = result;
      resolve(result);
    };
    img.onerror = () => {
      formatSupportCache.avif = false;
      resolve(false);
    };
    // Minimal AVIF image (1x1 pixel)
    img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgABpAQ0AIAyqA=';
  });
}

/**
 * Get best supported image format for current browser
 */
export async function getBestFormat(): Promise<ImageFormat> {
  // Check AVIF first (best compression)
  if (await supportsAVIF()) {
    return 'avif';
  }
  // Then WebP (good compression, wide support)
  if (await supportsWebP()) {
    return 'webp';
  }
  // Fallback to JPEG
  return 'jpeg';
}

/**
 * Get all supported formats in order of preference
 */
export async function getSupportedFormats(): Promise<ImageFormat[]> {
  const formats: ImageFormat[] = [];
  
  if (await supportsAVIF()) {
    formats.push('avif');
  }
  if (await supportsWebP()) {
    formats.push('webp');
  }
  
  // Always supported
  formats.push('jpeg', 'png', 'gif', 'svg');
  
  return formats;
}

/**
 * Detect image format from file or URL
 */
export function detectImageFormat(input: File | string): ImageFormat | null {
  let mimeType: string | null = null;
  let extension: string | null = null;

  if (input instanceof File) {
    mimeType = input.type.toLowerCase();
    extension = input.name.split('.').pop()?.toLowerCase() || null;
  } else {
    // URL or filename
    const url = input.toLowerCase();
    // Check for data URL
    if (url.startsWith('data:')) {
      const match = url.match(/^data:image\/(\w+)/);
      if (match) {
        mimeType = `image/${match[1]}`;
      }
    } else {
      // Extract extension from URL
      const pathPart = url.split('?')[0];
      extension = pathPart.split('.').pop() || null;
    }
  }

  // Map MIME type or extension to format
  const formatMap: Record<string, ImageFormat> = {
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'webp': 'webp',
    'avif': 'avif',
    'jpg': 'jpeg',
    'jpeg': 'jpeg',
    'png': 'png',
    'gif': 'gif',
    'svg': 'svg',
  };

  if (mimeType && formatMap[mimeType]) {
    return formatMap[mimeType];
  }
  if (extension && formatMap[extension]) {
    return formatMap[extension];
  }

  return null;
}

/**
 * Check if format is supported by browser
 */
export async function isFormatSupported(format: ImageFormat): Promise<boolean> {
  switch (format) {
    case 'avif':
      return supportsAVIF();
    case 'webp':
      return supportsWebP();
    default:
      return true;
  }
}

/**
 * Get content type for format
 */
export function getContentType(format: ImageFormat): string {
  const contentTypes: Record<ImageFormat, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return contentTypes[format];
}

/**
 * Get file extension for format
 */
export function getExtension(format: ImageFormat): string {
  const extensions: Record<ImageFormat, string> = {
    webp: 'webp',
    avif: 'avif',
    jpeg: 'jpg',
    png: 'png',
    gif: 'gif',
    svg: 'svg',
  };
  return extensions[format];
}

/**
 * Estimate compression ratio for format
 */
export function estimateCompressionRatio(format: ImageFormat): number {
  // Approximate compression ratios compared to uncompressed PNG
  const ratios: Record<ImageFormat, number> = {
    avif: 0.15,  // ~85% smaller
    webp: 0.25,  // ~75% smaller
    jpeg: 0.35,  // ~65% smaller
    png: 1.0,    // baseline
    gif: 0.8,    // varies
    svg: 0.1,    // varies greatly
  };
  return ratios[format];
}

/**
 * Convert image to specified format using canvas (client-side)
 */
export async function convertImageFormat(
  imageUrl: string,
  targetFormat: ImageFormat,
  quality: number = 0.85
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Image conversion only available in browser');
  }

  // SVG cannot be converted to other formats easily
  if (targetFormat === 'svg') {
    return imageUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const mimeType = getContentType(targetFormat);
      const dataUrl = canvas.toDataURL(mimeType, quality);
      
      resolve(dataUrl);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Get optimal image source with format detection
 * Returns srcSet for responsive images
 */
export async function getOptimalImageSrc(
  baseUrl: string,
  sizes: number[] = [320, 640, 1280]
): Promise<{
  src: string;
  srcSet: string;
  type: string;
}> {
  const format = await getBestFormat();
  const type = getContentType(format);
  
  // If URL supports format conversion (e.g., Cloudinary or Imgix)
  const supportsConversion = baseUrl.includes('cloudinary') ||
                             baseUrl.includes('imgix');
  
  if (supportsConversion) {
    const srcSet = sizes
      .map(size => {
        const url = new URL(baseUrl);
        url.searchParams.set('w', size.toString());
        url.searchParams.set('f', format);
        return `${url.toString()} ${size}w`;
      })
      .join(', ');
    
    return { src: baseUrl, srcSet, type };
  }
  
  // Return original URL if no conversion available
  return { src: baseUrl, srcSet: '', type };
}

/**
 * Preload image format detection on page load
 */
export async function preloadFormatDetection(): Promise<void> {
  await Promise.all([supportsWebP(), supportsAVIF()]);
}
