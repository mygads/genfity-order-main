'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import AlertDialog from '@/components/modals/AlertDialog';
import { useTranslation } from '@/lib/i18n/useTranslation';

function extractMerchantCode(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const merchantFromQuery = url.searchParams.get('merchantCode');
    if (merchantFromQuery) return merchantFromQuery.trim();

    const segments = url.pathname.split('/').filter(Boolean);
    
    // Handle /merchant/CODE format
    if (segments.length >= 2 && segments[0].toLowerCase() === 'merchant') {
      return segments[1];
    }

    if (segments.length > 0) return segments[0];
  } catch {
    // Not a URL, fall back to regex below.
  }

  const matches = value.match(/[A-Za-z0-9]{3,}/g);
  if (!matches?.length) return null;
  return matches[matches.length - 1];
}

export default function CustomerMerchantNotFound() {
  const router = useRouter();
  const { t } = useTranslation();

  const [merchantCode, setMerchantCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>(
    {
      isOpen: false,
      title: '',
      message: ''
    }
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);
  const detectInFlightRef = useRef(false);
  const lastScanAtRef = useRef(0);
  const scanningRef = useRef(false);

  const merchantMessage = useMemo(() => {
    const legacy = t('customer.notFound.merchantMessage');
    return legacy.replace(/\.\s+/g, '.\n');
  }, [t]);

  const stopScanner = () => {
    scanningRef.current = false;
    if (scanRafRef.current) {
      cancelAnimationFrame(scanRafRef.current);
      scanRafRef.current = null;
    }
    detectInFlightRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setShowScanner(false);
  };

  useEffect(() => {
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMerchantCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = merchantCode.trim();
    if (!trimmed) return;
    router.push(`/merchant/${trimmed.toUpperCase()}`);
  };

  const beginScanLoop = () => {
    const tick = async () => {
      if (!scanningRef.current) return;
      const videoEl = videoRef.current;

      if (!videoEl) {
        scanRafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      if (!detectInFlightRef.current && now - lastScanAtRef.current > 250) {
        lastScanAtRef.current = now;
        detectInFlightRef.current = true;

        try {
          const canvasEl = canvasRef.current;
          if (!canvasEl || videoEl.readyState < 2) {
            return;
          }

          const width = videoEl.videoWidth || 0;
          const height = videoEl.videoHeight || 0;
          if (width === 0 || height === 0) {
            return;
          }

          canvasEl.width = width;
          canvasEl.height = height;
          const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            return;
          }

          ctx.drawImage(videoEl, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);
          const decoded = jsQR(imageData.data, width, height);

          if (decoded?.data) {
            const extracted = extractMerchantCode(decoded.data);
            if (extracted) {
              setMerchantCode(extracted.toUpperCase());
              stopScanner();
              router.push(`/merchant/${extracted.toUpperCase()}`);
              return;
            }

            setAlertState({
              isOpen: true,
              title: t('common.error'),
              message: t('customer.notFound.invalidQr')
            });
          }
        } catch {
          // Ignore per-frame errors.
        } finally {
          detectInFlightRef.current = false;
        }
      }

      scanRafRef.current = requestAnimationFrame(tick);
    };

    scanRafRef.current = requestAnimationFrame(tick);
  };

  const startScanner = async () => {
    setShowScanner(true);
    scanningRef.current = true;

    if (!navigator?.mediaDevices?.getUserMedia) {
      scanningRef.current = false;
      setShowScanner(false);
      setAlertState({
        isOpen: true,
        title: t('admin.orders.scanQrCameraErrorTitle'),
        message: t('admin.orders.scanQrUnsupportedText')
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (!videoRef.current) return;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      beginScanLoop();
    } catch (err) {
      console.error('Camera access denied:', err);
      scanningRef.current = false;
      setShowScanner(false);
      setAlertState({
        isOpen: true,
        title: t('admin.orders.scanQrCameraErrorTitle'),
        message: t('admin.orders.scanQrUnsupportedText')
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-125 mx-auto w-full bg-white shadow-sm">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center px-4 py-3">
            <h1 className="flex-1 text-center font-semibold text-gray-900 text-base">{t('common.notFound')}</h1>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-70 mb-8">
            <Image
              src="/images/error/404.png"
              alt={t('common.notFound')}
              width={472}
              height={152}
              className="w-full h-auto"
              priority
            />
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('admin.merchant.notFound')}</h2>
            <p className="text-sm text-gray-500 whitespace-pre-line">{merchantMessage}</p>
          </div>

          <form onSubmit={handleMerchantCodeSubmit} className="w-full max-w-xs mb-6">
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              <input
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                placeholder={t('landing.merchantCodePlaceholder')}
                className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 uppercase"
              />
              <div className="flex items-center border-l border-gray-200">
                <button
                  type="button"
                  onClick={startScanner}
                  className="p-3 text-gray-400 hover:text-brand-500 transition-colors hover:bg-gray-100"
                  title={t('landing.hero.scanQR')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <path d="M17 14v3h3" />
                    <path d="M14 17h3v3" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={!merchantCode.trim()}
                  className="p-3 text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-30 hover:bg-gray-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </main>

        <footer className="py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">{t('landing.footer')}</p>
        </footer>
      </div>

      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">{t('landing.hero.scanQR')}</h3>
                <button
                  onClick={stopScanner}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label={t('common.close')}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="relative aspect-square bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br"></div>
                    <div
                      className="absolute inset-x-0 h-0.5 bg-brand-500"
                      style={{
                        animation: 'scan 2s ease-in-out infinite'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">{t('landing.hero.scanInstructions')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0%,
          100% {
            top: 0;
          }
          50% {
            top: calc(100% - 2px);
          }
        }
      `}</style>

      <canvas ref={canvasRef} className="hidden" />

      <AlertDialog
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        variant="warning"
        onClose={() => setAlertState({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
}
