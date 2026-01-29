'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { customerMerchantHomeUrl } from '@/lib/utils/customerRoutes';

interface OutletModalProps {
  merchantCode: string;
  merchantData: {
    name: string;
    address?: string;
    phone?: string;
    openingHours?: Array<{
      id: bigint;
      dayOfWeek: number;
      isClosed: boolean;
      is24Hours: boolean;
      openTime?: string;
      closeTime?: string;
    }>;
  };
}

/**
 * Outlet Information Modal - Bottom Sheet
 * 
 * Based on FRONTEND_SPECIFICATION.md:
 * - Bottom sheet style with drag handle
 * - Outlet name, address, action buttons
 * - Operating hours table (SENIN-MINGGU)
 * - Hash-based routing (#outlet)
 * - Slide animation 0.3s
 */
export default function OutletModal({ merchantCode, merchantData }: OutletModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

  useEffect(() => {
    // Check if hash is #outlet
    const checkHash = () => {
      setIsOpen(window.location.hash === '#outlet');
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleClose = () => {
    // Remove hash from URL
    router.push(customerMerchantHomeUrl(merchantCode));
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay - rgba(0,0,0,0.4), z-index 200 */}
      <div
        className="fixed inset-0 bg-black/40 z-[200] transition-opacity duration-200"
        onClick={handleClose}
      />

      {/* Bottom Sheet - Slide from bottom 0.3s */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[200] max-h-[90vh] overflow-y-auto transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-[#E0E0E0] rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#F9F9F9] text-[#666666] hover:bg-[#E0E0E0] transition-colors"
        >
          ✕
        </button>

        {/* Content */}
        <div className="px-4 pb-6">
          {/* Outlet Name - 20px/700 */}
          <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-4 pr-8">
            {merchantData.name}
          </h2>

          {/* Address - 14px/400, line-height 1.5 */}
          {merchantData.address && (
            <div className="mb-4">
              <p className="text-sm text-[#666666] leading-relaxed">
                📍 {merchantData.address}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            {merchantData.phone && (
              <a
                href={`tel:${merchantData.phone}`}
                className="flex-1 h-11 bg-brand-500 text-white text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-brand-600 transition-all active:scale-[0.98]"
              >
                📞 Hubungi
              </a>
            )}
            {merchantData.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchantData.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-11 bg-white border-2 border-brand-500 text-brand-500 text-sm font-semibold rounded-lg flex items-center justify-center hover:bg-brand-50 transition-all active:scale-[0.98]"
              >
                🗺️ Kunjungi
              </a>
            )}
          </div>

          {/* Operating Hours Table */}
          {merchantData.openingHours && merchantData.openingHours.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-[#1A1A1A] mb-3">
                Jam Operasional
              </h3>
              <div className="space-y-2">
                {merchantData.openingHours
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((hours) => (
                    <div
                      key={hours.id.toString()}
                      className="flex items-center justify-between py-2 border-b border-[#F5F5F5]"
                    >
                      <span className="text-sm font-medium text-[#1A1A1A]">
                        {dayNames[hours.dayOfWeek]}
                      </span>
                      <span className="text-sm text-[#666666]">
                        {hours.isClosed
                          ? 'Tutup'
                          : hours.is24Hours
                          ? 'Buka 24 Jam'
                          : `${hours.openTime} - ${hours.closeTime}`}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
