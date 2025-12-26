/**
 * Image Optimizer Utility
 * Handles image optimization including:
 * - WebP conversion
 * - Auto-resize to max dimensions
 * - Quality optimization
 */

import sharp from 'sharp';

export interface OptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 1-100
    format?: 'webp' | 'jpeg' | 'png';
    preserveAspectRatio?: boolean;
}

export interface OptimizedImage {
    buffer: Buffer;
    format: string;
    width: number;
    height: number;
    originalSize: number;
    optimizedSize: number;
    savingsPercent: number;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'webp',
    preserveAspectRatio: true,
};

/**
 * Optimize an image buffer
 */
export async function optimizeImage(
    inputBuffer: Buffer,
    options: OptimizeOptions = {}
): Promise<OptimizedImage> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = inputBuffer.length;

    let pipeline = sharp(inputBuffer);

    // Get original metadata
    const metadata = await pipeline.metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Calculate resize dimensions
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (opts.maxWidth && originalWidth > opts.maxWidth) {
        targetWidth = opts.maxWidth;
        if (opts.preserveAspectRatio) {
            targetHeight = Math.round((originalHeight / originalWidth) * targetWidth);
        }
    }

    if (opts.maxHeight && targetHeight > opts.maxHeight) {
        targetHeight = opts.maxHeight;
        if (opts.preserveAspectRatio) {
            targetWidth = Math.round((originalWidth / originalHeight) * targetHeight);
        }
    }

    // Resize if needed
    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
        pipeline = pipeline.resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
        });
    }

    // Convert to target format
    let outputBuffer: Buffer;
    switch (opts.format) {
        case 'webp':
            outputBuffer = await pipeline
                .webp({ quality: opts.quality })
                .toBuffer();
            break;
        case 'jpeg':
            outputBuffer = await pipeline
                .jpeg({ quality: opts.quality, mozjpeg: true })
                .toBuffer();
            break;
        case 'png':
            outputBuffer = await pipeline
                .png({ compressionLevel: 9 })
                .toBuffer();
            break;
        default:
            outputBuffer = await pipeline
                .webp({ quality: opts.quality })
                .toBuffer();
    }

    const optimizedSize = outputBuffer.length;
    const savingsPercent = Math.round(((originalSize - optimizedSize) / originalSize) * 100);

    return {
        buffer: outputBuffer,
        format: opts.format || 'webp',
        width: targetWidth,
        height: targetHeight,
        originalSize,
        optimizedSize,
        savingsPercent,
    };
}

/**
 * Optimize image from URL
 */
export async function optimizeImageFromUrl(
    url: string,
    options: OptimizeOptions = {}
): Promise<OptimizedImage> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return optimizeImage(buffer, options);
}

/**
 * Generate thumbnail
 */
export async function generateThumbnail(
    inputBuffer: Buffer,
    size: number = 200
): Promise<OptimizedImage> {
    return optimizeImage(inputBuffer, {
        maxWidth: size,
        maxHeight: size,
        quality: 70,
        format: 'webp',
    });
}

/**
 * Get image dimensions without full processing
 */
export async function getImageDimensions(
    inputBuffer: Buffer
): Promise<{ width: number; height: number; format: string }> {
    const metadata = await sharp(inputBuffer).metadata();
    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
    };
}

/**
 * Check if image needs optimization (based on size)
 */
export function needsOptimization(
    buffer: Buffer,
    maxSizeKb: number = 500
): boolean {
    return buffer.length > maxSizeKb * 1024;
}

/**
 * Get optimal quality based on image dimensions
 * Larger images can use lower quality without visible loss
 */
export function getOptimalQuality(width: number, height: number): number {
    const pixels = width * height;

    if (pixels > 4000000) return 70; // 4MP+
    if (pixels > 2000000) return 75; // 2MP+
    if (pixels > 1000000) return 80; // 1MP+
    return 85; // Smaller images
}
