'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaCamera, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

type BarcodeDetectorType = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
};

type QRCodeScanModalProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  closeLabel: string;
  unsupportedTitle: string;
  unsupportedText: string;
  cameraErrorTitle: string;
  startingText: string;
  hintText: string;
  onClose: () => void;
  onScan: (value: string) => void;
};

export default function QRCodeScanModal({
  isOpen,
  title,
  subtitle,
  closeLabel,
  unsupportedTitle,
  unsupportedText,
  cameraErrorTitle,
  startingText,
  hintText,
  onClose,
  onScan,
}: QRCodeScanModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const supportsBarcodeDetector = useMemo(() => {
    return typeof window !== 'undefined' && 'BarcodeDetector' in window;
  }, []);

  const stop = async () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsStarting(false);
      stop();
      return;
    }

    let cancelled = false;

    const start = async () => {
      setError(null);
      setIsStarting(true);

      try {
        if (!supportsBarcodeDetector) {
          setError('QR scanning is not supported in this browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          throw new Error('Camera preview unavailable');
        }

        video.srcObject = stream;
        await video.play();

        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] }) as BarcodeDetectorType;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas not supported');
        }

        const loop = async () => {
          if (!videoRef.current || cancelled) return;

          try {
            const v = videoRef.current;
            const width = v.videoWidth;
            const height = v.videoHeight;

            if (width > 0 && height > 0) {
              canvas.width = width;
              canvas.height = height;
              ctx.drawImage(v, 0, 0, width, height);

              const results = await detector.detect(canvas);
              const rawValue = results?.[0]?.rawValue;
              if (rawValue) {
                await stop();
                onScan(rawValue);
                return;
              }
            }
          } catch {
            // Ignore detection errors; keep scanning
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to access camera';
        setError(message);
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supportsBarcodeDetector]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg mx-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {!supportsBarcodeDetector ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">{unsupportedTitle}</p>
                  <p className="mt-1 text-sm opacity-90">{unsupportedText}</p>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-semibold">{cameraErrorTitle}</p>
                  <p className="mt-1 text-sm opacity-90">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <FaCamera className="h-4 w-4" />
                  <span>{isStarting ? startingText : hintText}</span>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {closeLabel}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
