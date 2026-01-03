'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image, { ImageProps } from 'next/image';

interface LazyImageProps extends Omit<ImageProps, 'onLoad' | 'placeholder' | 'blurDataURL'> {
  /**
   * Custom blur placeholder - can be a data URL or hex color
   */
  blurPlaceholder?: string;
  /**
   * Enable/disable lazy loading (default: true)
   */
  lazy?: boolean;
  /**
   * Threshold for intersection observer (0-1)
   */
  threshold?: number;
  /**
   * Root margin for intersection observer
   */
  rootMargin?: string;
  /**
   * Fade duration in milliseconds
   */
  fadeDuration?: number;
  /**
   * Show shimmer effect while loading
   */
  shimmer?: boolean;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Callback when image loads
   */
  onImageLoad?: () => void;
  /**
   * Callback when image errors
   */
  onImageError?: () => void;
}

/**
 * Generate a blur placeholder data URL
 */
function generateBlurPlaceholder(color: string = '#f3f4f6'): string {
  // SVG blur placeholder
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="${color}"/>
      <rect width="100" height="100" fill="${color}" filter="url(#blur)"/>
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
      </defs>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
}

/**
 * Generate shimmer placeholder
 */
function generateShimmerPlaceholder(width: number = 100, height: number = 100): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f3f4f6">
            <animate attributeName="offset" values="-2;1" dur="2s" repeatCount="indefinite"/>
          </stop>
          <stop offset="50%" style="stop-color:#e5e7eb">
            <animate attributeName="offset" values="-1;2" dur="2s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" style="stop-color:#f3f4f6">
            <animate attributeName="offset" values="0;3" dur="2s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shimmer)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg.trim())}`;
}

/**
 * LazyImage Component
 * 
 * A Next.js Image wrapper with:
 * - Lazy loading using Intersection Observer
 * - Blur/shimmer placeholder while loading
 * - Smooth fade-in animation
 * - Error handling with fallback
 */
export default function LazyImage({
  src,
  alt,
  blurPlaceholder,
  lazy = true,
  threshold = 0.1,
  rootMargin = '50px',
  fadeDuration = 300,
  shimmer = false,
  loadingComponent,
  onImageLoad,
  onImageError,
  className = '',
  style,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [hasError, setHasError] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  // Generate placeholder
  const placeholder = useMemo(() => {
    if (blurPlaceholder) {
      // If it starts with # or rgb, it's a color
      if (blurPlaceholder.startsWith('#') || blurPlaceholder.startsWith('rgb')) {
        return generateBlurPlaceholder(blurPlaceholder);
      }
      // Otherwise assume it's already a data URL
      return blurPlaceholder;
    }
    if (shimmer) {
      return generateShimmerPlaceholder();
    }
    return generateBlurPlaceholder();
  }, [blurPlaceholder, shimmer]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imageRef.current) {
      observer.observe(imageRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
    onImageLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onImageError?.();
  };

  // Error fallback
  if (hasError) {
    return (
      <div
        ref={imageRef}
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}
        style={style}
      >
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={imageRef}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      {/* Loading placeholder */}
      {(!isLoaded || !isInView) && (
        loadingComponent || (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${placeholder})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )
      )}

      {/* Actual image */}
      {isInView && (
        <Image
          src={src}
          alt={alt}
          className={`transition-opacity ${className}`}
          style={{
            ...style,
            opacity: isLoaded ? 1 : 0,
            transitionDuration: `${fadeDuration}ms`,
          }}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Generate blur placeholder for a specific image
 * Can be used with getStaticProps for SSG
 */
export function generateImagePlaceholder(color?: string): string {
  return generateBlurPlaceholder(color);
}

/**
 * Generate shimmer placeholder
 */
export function generateShimmer(width?: number, height?: number): string {
  return generateShimmerPlaceholder(width, height);
}
