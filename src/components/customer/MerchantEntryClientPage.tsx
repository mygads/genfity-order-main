'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsQR from 'jsqr';
import { useTranslation } from '@/lib/i18n/useTranslation';

function extractMerchantCode(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const merchantFromQuery = url.searchParams.get('merchantCode');
    if (merchantFromQuery) return merchantFromQuery.trim();

    const segments = url.pathname.split('/').filter(Boolean);

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

export default function MerchantEntryClientPage() {
  const router = useRouter();
  const { t } = useTranslation();

  const [merchantCode, setMerchantCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanRafRef = useRef<number | null>(null);
  const detectInFlightRef = useRef(false);
  const lastScanAtRef = useRef(0);
  const scanningRef = useRef(false);

  const placeholder = useMemo(() => {
    const key = t('landing.merchantCodePlaceholder');
    return key === 'landing.merchantCodePlaceholder' ? 'Enter merchant code' : key;
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

  const goToMerchant = (raw: string) => {
    const extracted = extractMerchantCode(raw);
    if (!extracted) {
      setError(t('customer.notFound.invalidQr') || 'Invalid merchant code');
      return;
    }

    const code = extracted.toUpperCase();
    router.push(`/merchant/${code}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!merchantCode.trim()) return;
    goToMerchant(merchantCode);
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
          if (!canvasEl || videoEl.readyState < 2) return;

          const width = videoEl.videoWidth || 0;
          const height = videoEl.videoHeight || 0;
          if (width === 0 || height === 0) return;

          canvasEl.width = width;
          canvasEl.height = height;
          const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

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

            setError(t('customer.notFound.invalidQr') || 'Invalid QR code');
          }
        } finally {
          detectInFlightRef.current = false;
        }
      }

      scanRafRef.current = requestAnimationFrame(tick);
    };

    scanRafRef.current = requestAnimationFrame(tick);
  };

  const startScanner = async () => {
    setError(null);
    setShowScanner(true);
    scanningRef.current = true;

    if (!navigator?.mediaDevices?.getUserMedia) {
      scanningRef.current = false;
      setShowScanner(false);
      setError(t('admin.orders.scanQrUnsupportedText') || 'Camera is not supported in this browser.');
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
    } catch {
      scanningRef.current = false;
      setShowScanner(false);
      setError(t('admin.orders.scanQrUnsupportedText') || 'Unable to access camera.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col max-w-125 mx-auto w-full bg-white shadow-sm">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center px-4 py-3">
            <div className="w-10" aria-hidden="true" />
            <h1 className="flex-1 text-center font-semibold text-gray-900 text-base">{t('customer.selectMerchant') || 'Select Merchant'}</h1>
            <Link
              href="/profile"
              aria-label={t('customer.profile.title') || 'Profile'}
              className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm hover:bg-gray-50 active:scale-95 transition-all duration-200 -mr-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2">
                <Image
                  className="dark:hidden"
                  src="/images/logo/logo.png"
                  alt="Genfity"
                  width={200}
                  height={100}
                  priority
                />
                <Image
                  className="hidden dark:block"
                  src="/images/logo/logo-dark-mode.png"
                  alt="Genfity"
                  width={200}
                  height={100}
                  priority
                />
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
              <p className="text-sm text-gray-600 text-center mb-4">
                {t('landing.hero.scanInstructions') || 'Scan the merchant QR code or enter the merchant code.'}
              </p>

              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
                  <input
                    type="text"
                    value={merchantCode}
                    onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                    placeholder={placeholder}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm font-semibold text-gray-900 placeholder:text-gray-400 uppercase"
                  />
                  <div className="flex items-center border-l border-gray-200">
                    <button
                      type="button"
                      onClick={startScanner}
                      className="p-3 text-gray-400 hover:text-brand-500 transition-colors hover:bg-gray-100"
                      title={t('landing.hero.scanQR')}
                      aria-label={t('landing.hero.scanQR')}
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
                      aria-label={t('common.next') || 'Continue'}
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
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
              </form>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">{t('landing.footer')}</p>
        </footer>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">{t('landing.hero.scanQR')}</h3>
              <button
                type="button"
                onClick={stopScanner}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="relative aspect-square bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-44 h-44 relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br" />
                </div>
              </div>
            </div>

            <div className="p-3 text-center bg-gray-50">
              <p className="text-xs text-gray-500">{t('landing.hero.scanInstructions')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
