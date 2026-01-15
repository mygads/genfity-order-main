'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AlertDialog from "@/components/modals/AlertDialog";

export default function NotFound() {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [alertState, setAlertState] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleMerchantCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (merchantCode.trim()) {
      router.push(`/${merchantCode.toUpperCase()}`);
    }
  };

  const startScanner = async () => {
    setShowScanner(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (err) {
      console.error('Camera access denied:', err);
      setShowScanner(false);
      setAlertState({
        isOpen: true,
        title: 'Camera Access Required',
        message: 'Unable to access camera. Please check permissions.'
      });
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Container - Mobile First like Order Page */}
      <div className="flex-1 flex flex-col max-w-[500px] mx-auto w-full bg-white shadow-sm">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
          <div className="flex items-center px-4 py-3">
            <Link
              href="/"
              className="w-10 h-10 flex items-center justify-center -ml-2"
              aria-label="Back to Home"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
              Page Not Found
            </h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

          {/* 404 Image */}
          <div className="w-full max-w-[280px] mb-8">
            <Image
              src="/images/error/404.png"
              alt="404 - Page Not Found"
              width={472}
              height={152}
              className="w-full h-auto"
              priority
            />
          </div>

          {/* Message */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Merchant Not Found
            </h2>
            <p className="text-sm text-gray-500">
              We couldn&apos;t find the merchant you&apos;re looking for.
              <br />
              Please enter a valid merchant code below.
            </p>
          </div>

          {/* Merchant Code Input with QR Scan */}
          <form onSubmit={handleMerchantCodeSubmit} className="w-full max-w-xs mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Enter Merchant Code
            </label>
            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-xl overflow-hidden focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              <input
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value.toUpperCase())}
                placeholder="e.g. ASD021"
                className="flex-1 px-4 py-3 bg-transparent border-none focus:ring-0 outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400 uppercase"
              />
              <div className="flex items-center border-l border-gray-200">
                {/* QR Scan Button */}
                <button
                  type="button"
                  onClick={startScanner}
                  className="p-3 text-gray-400 hover:text-brand-500 transition-colors hover:bg-gray-100"
                  title="Scan QR Code"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="3" height="3" />
                    <path d="M17 14v3h3" />
                    <path d="M14 17h3v3" />
                  </svg>
                </button>
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!merchantCode.trim()}
                  className="p-3 text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-30 hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* OR Divider */}
          <div className="flex items-center gap-4 w-full max-w-xs mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Back to Home Button */}
          <Link
            href="/"
            className="w-full max-w-xs h-12 flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            Back to Home Page
          </Link>
        </main>

        {/* Footer */}
        <footer className="py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} GENFITY DIGITAL SOLUTION. All rights reserved.
          </p>
        </footer>
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  Scan QR Code
                </h3>
                <button
                  onClick={stopScanner}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Camera View */}
              <div className="relative aspect-square bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Scan Frame Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 relative">
                    {/* Corner markers */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br"></div>
                    {/* Scan line animation */}
                    <div
                      className="absolute inset-x-0 h-0.5 bg-brand-500"
                      style={{
                        animation: 'scan 2s ease-in-out infinite'
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 text-center">
                <p className="text-sm text-gray-500">
                  Point your camera at a merchant QR code
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan Animation Keyframes */}
      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
      `}</style>
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
