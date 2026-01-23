'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FaRedo } from 'react-icons/fa';

interface LazyMenuImageProps {
  src: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  /** Root margin for intersection observer. Default "300px" loads 3 items ahead for vertical scroll */
  rootMargin?: string;
  /** Scroll direction - affects how rootMargin is applied. Default "vertical" */
  scrollDirection?: 'vertical' | 'horizontal';
  /** Placeholder component while loading */
  placeholder?: React.ReactNode;
  /** onClick handler */
  onClick?: () => void;
  /** Style props for container */
  style?: React.CSSProperties;
  /** Fill mode for Next/Image */
  fill?: boolean;
  /** Enable blur-up effect with low quality placeholder */
  blurUp?: boolean;
  /** Number of items ahead to prefetch. Default 2 */
  prefetchAhead?: number;
  /** Max retry attempts on error. Default 3 */
  maxRetries?: number;
}

// Global prefetch cache to avoid duplicate prefetches
const prefetchedUrls = new Set<string>();

/**
 * Prefetch an image URL
 */
function prefetchImage(url: string): void {
  if (!url || prefetchedUrls.has(url)) return;
  prefetchedUrls.add(url);
  
  const img = new window.Image();
  img.src = url;
}

/**
 * LazyMenuImage - Lazy loading image component for menu items
 * 
 * Features:
 * - IntersectionObserver for lazy loading with configurable rootMargin
 * - Progressive blur-up effect for smooth image reveal
 * - Prefetching for images likely to be viewed next
 * - Error state handling with retry mechanism
 * - Native loading="lazy" as fallback for older browsers
 * - Supports both vertical and horizontal scroll directions
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 */
export default function LazyMenuImage({
  src,
  alt,
  className = 'object-cover',
  width,
  height,
  sizes = '70px',
  priority = false,
  rootMargin = '300px',
  scrollDirection = 'vertical',
  placeholder,
  onClick,
  style,
  fill = true,
  blurUp = true,
  prefetchAhead = 2,
  maxRetries = 3,
}: LazyMenuImageProps) {
  const [isVisible, setIsVisible] = useState(priority);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [blurDataUrl, setBlurDataUrl] = useState<string | null>(null);
  const [activeSrc, setActiveSrc] = useState<string>(src || '/images/default-menu.png');
  const containerRef = useRef<HTMLDivElement>(null);
  const observerSupported = typeof IntersectionObserver !== 'undefined';

  useEffect(() => {
    setActiveSrc(src || '/images/default-menu.png');
    setIsLoaded(false);
    setHasError(false);
    setRetryCount(0);
  }, [src]);

  // Generate blur placeholder for blur-up effect
  useEffect(() => {
    if (!blurUp || !src || priority) return;
    
    // Create a tiny placeholder data URL for blur effect
    // Using a simple gray placeholder that matches the loading state
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#e5e7eb'; // gray-200
      ctx.fillRect(0, 0, 10, 10);
      setBlurDataUrl(canvas.toDataURL('image/jpeg', 0.1));
    }
  }, [blurUp, src, priority]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsVisible(true);
      return;
    }

    // Fallback for browsers without IntersectionObserver
    if (!observerSupported) {
      setIsVisible(true);
      return;
    }

    const computedRootMargin = scrollDirection === 'horizontal' 
      ? `0px ${rootMargin} 0px ${rootMargin}`
      : `${rootMargin} 0px ${rootMargin} 0px`;

    // Extended margin for prefetching (2x the normal margin)
    const prefetchMargin = scrollDirection === 'horizontal'
      ? `0px ${parseInt(rootMargin) * prefetchAhead}px 0px ${parseInt(rootMargin) * prefetchAhead}px`
      : `${parseInt(rootMargin) * prefetchAhead}px 0px ${parseInt(rootMargin) * prefetchAhead}px 0px`;

    // Main visibility observer
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            visibilityObserver.disconnect();
          }
        });
      },
      { rootMargin: computedRootMargin, threshold: 0 }
    );

    // Prefetch observer (larger margin)
    const prefetchObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && src) {
            prefetchImage(src);
            prefetchObserver.disconnect();
          }
        });
      },
      { rootMargin: prefetchMargin, threshold: 0 }
    );

    if (containerRef.current) {
      visibilityObserver.observe(containerRef.current);
      if (src && !priority) {
        prefetchObserver.observe(containerRef.current);
      }
    }

    return () => {
      visibilityObserver.disconnect();
      prefetchObserver.disconnect();
    };
  }, [priority, rootMargin, scrollDirection, observerSupported, src, prefetchAhead]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  // Handle image load error
  const handleError = useCallback(() => {
    // If the CDN image fails (often 404), immediately fall back to default.
    // We can't reliably detect 404 vs other failures from onError, so treat
    // any failure of a remote src as a signal to show a safe local placeholder.
    if (src && activeSrc !== '/images/default-menu.png') {
      setActiveSrc('/images/default-menu.png');
      setIsLoaded(false);
      setHasError(false);
      setRetryCount(0);
      return;
    }

    // If even the default image fails, then use the existing retry+error UI.
    if (retryCount < maxRetries) {
      const timeout = Math.pow(2, retryCount) * 500;
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
      }, timeout);
    } else {
      setHasError(true);
    }
  }, [retryCount, maxRetries, src, activeSrc]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setHasError(false);
    setIsLoaded(false);
  }, []);

  // Default placeholder with shimmer effect
  const defaultPlaceholder = (
    <div 
      className="absolute inset-0 flex items-center justify-center bg-gray-100"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      <svg 
        className="w-8 h-8 text-gray-300" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );

  // Error state with retry button
  const errorPlaceholder = (
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 gap-2"
      style={{ width: '100%', height: '100%' }}
    >
      <svg 
        className="w-6 h-6 text-gray-400" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRetry();
        }}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Retry loading image"
      >
        <FaRedo className="w-3 h-3" />
        <span>Retry</span>
      </button>
    </div>
  );

  // Generate blur-up style
  const blurUpStyle: React.CSSProperties = blurUp && blurDataUrl && !isLoaded ? {
    filter: 'blur(10px)',
    transform: 'scale(1.1)',
  } : {};

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      style={{
        position: 'relative',
        width: width || '100%',
        height: height || '100%',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {hasError ? (
        errorPlaceholder
      ) : isVisible ? (
        <>
          {/* Blur placeholder for blur-up effect */}
          {blurUp && blurDataUrl && !isLoaded && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${blurDataUrl})`,
                filter: 'blur(20px)',
                transform: 'scale(1.2)',
              }}
            />
          )}
          
          {/* Loading shimmer (shown until image loads) */}
          {!isLoaded && (placeholder || defaultPlaceholder)}
          
          {/* Actual image with blur-up transition */}
          {fill ? (
            <Image
              src={`${activeSrc}${retryCount > 0 ? `?retry=${retryCount}` : ''}`}
              alt={alt}
              fill
              className={`${className} transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105'}`}
              sizes={sizes}
              onLoad={handleLoad}
              onError={handleError}
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              style={blurUpStyle}
            />
          ) : (
            <Image
              src={`${activeSrc}${retryCount > 0 ? `?retry=${retryCount}` : ''}`}
              alt={alt}
              width={width || 70}
              height={height || 70}
              className={`${className} transition-all duration-500 ease-out ${isLoaded ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-sm scale-105'}`}
              onLoad={handleLoad}
              onError={handleError}
              priority={priority}
              loading={priority ? undefined : 'lazy'}
              style={blurUpStyle}
            />
          )}
        </>
      ) : (
        // Placeholder while waiting for intersection
        placeholder || defaultPlaceholder
      )}
    </div>
  );
}
