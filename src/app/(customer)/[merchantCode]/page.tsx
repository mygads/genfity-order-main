'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerHeader from '@/components/customer/CustomerHeader';
import TableNumberModal from '@/components/customer/TableNumberModal';
import Image from 'next/image';

interface MerchantPageProps {
  params: Promise<{
    merchantCode: string;
  }>;
}

interface MerchantData {
  id: bigint;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  coverImageUrl?: string;
  openingHours: {
    id: bigint;
    dayOfWeek: number;
    isClosed: boolean;
    is24Hours: boolean;
    openTime?: string;
    closeTime?: string;
  }[];
}

/**
 * GENFITY - Order Mode Selection Page
 * 
 * User chooses between Dine-in or Takeaway after entering merchant code.
 * 
 * @specification FRONTEND_SPECIFICATION.md - 3. MERCHANT MODE SELECTION
 * 
 * Design specs:
 * - Header: 56px height, back button
 * - Merchant banner: 200px height, gradient overlay
 * - Info section: Name (20px/700), address (13px/400), phone, hours
 * - Mode buttons: 56px height, 100% width, 16px/600
 * - "Lihat Info Outlet" link: 13px/600, #FF6B35
 * 
 * Flow:
 * 1. Check localStorage for cached mode
 * 2. If found → redirect to /[merchantCode]/order?mode=[mode]
 * 3. Otherwise → show mode selection buttons
 * 4. User clicks "Makan di Tempat" → /order?mode=dinein
 * 5. User clicks "Ambil Sendiri" → /order?mode=takeaway
 * 
 * @param {Promise<{merchantCode: string}>} params - Route params
 */
export default function MerchantModePage({ params }: MerchantPageProps) {
  const router = useRouter();
  const [merchantCode, setMerchantCode] = useState<string>('');
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutletInfo, setShowOutletInfo] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);

  useEffect(() => {
    params.then(({ merchantCode: code }) => {
      setMerchantCode(code);
      
      // Check localStorage for cached mode
      const cachedMode = localStorage.getItem(`mode_${code}`);
      if (cachedMode === 'dinein' || cachedMode === 'takeaway') {
        router.push(`/${code}/order?mode=${cachedMode}`);
        return;
      }
      
      // Fetch merchant data
      fetchMerchant(code);
    });
  }, [params, router]);

  const fetchMerchant = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/public/merchants/${code}`);
      
      if (!response.ok) {
        throw new Error('Merchant tidak ditemukan');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Gagal memuat data merchant');
      }
      
      setMerchant(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      console.error('Failed to fetch merchant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSelect = (mode: 'dinein' | 'takeaway') => {
    // Save mode to localStorage
    localStorage.setItem(`mode_${merchantCode}`, mode);
    
    // For dine-in, show table number modal first
    if (mode === 'dinein') {
      setShowTableModal(true);
    } else {
      // For takeaway, go directly to order page
      router.push(`/${merchantCode}/order?mode=${mode}`);
    }
  };

  const handleTableNumberConfirm = (_tableNumber: string) => {
    setShowTableModal(false);
    // Navigate to order page with dine-in mode
    router.push(`/${merchantCode}/order?mode=dinein`);
  };

  const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-secondary">Memuat data merchant...</p>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <span className="text-6xl">😕</span>
          <h1 className="mt-4 text-xl font-bold text-primary-dark">
            {error || 'Merchant Tidak Ditemukan'}
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Pastikan kode merchant yang Anda masukkan benar
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-hover transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-[420px] mx-auto bg-white min-h-svh flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Header - 56px */}
      <CustomerHeader
        merchantCode={merchantCode}
        showBackButton={true}
        onBack={() => router.push('/')}
        title={merchant.name}
      />

      {/* Merchant Banner - 200px height */}
      <div className="relative h-[200px] w-full overflow-hidden">
        {merchant.coverImageUrl ? (
          <>
            <Image
              src={merchant.coverImageUrl}
              alt={merchant.name}
              fill
              className="object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
          </>
        ) : (
          <div className="w-full h-full bg-bg-primary flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
      </div>

      {/* Merchant Info Section */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-200">
        {/* Name - 20px/700/#1A1A1A */}
        <h1 className="text-xl font-bold text-primary-dark mb-2">
          {merchant.name}
        </h1>
        
        {/* Address - 13px/400/#666, max 2 lines */}
        {merchant.address && (
          <p className="text-[13px] text-secondary line-clamp-2 mb-3">
            📍 {merchant.address}
          </p>
        )}
        
        {/* Phone - 13px/#999 */}
        {merchant.phone && (
          <a
            href={`tel:${merchant.phone}`}
            className="inline-flex items-center gap-1 text-[13px] text-neutral-400 hover:text-primary mb-3"
          >
            📞 {merchant.phone}
          </a>
        )}
        
        {/* Hours - 13px/#999 */}
        <p className="text-[13px] text-neutral-400 mb-3">
          {merchant.openingHours?.[0]?.is24Hours
            ? '🕐 Buka 24 Jam'
            : merchant.openingHours?.[0]?.isClosed
            ? '🕐 Tutup'
            : `🕐 ${merchant.openingHours?.[0]?.openTime || '08:00'} - ${merchant.openingHours?.[0]?.closeTime || '22:00'}`}
        </p>
        
        {/* Outlet info link - 13px/600/#FF6B35 */}
        <button
          onClick={() => setShowOutletInfo(!showOutletInfo)}
          className="text-[13px] font-semibold text-primary flex items-center gap-1"
        >
          Lihat Info Outlet
          <span className={`transition-transform ${showOutletInfo ? 'rotate-90' : ''}`}>›</span>
        </button>
      </div>

      {/* Outlet Info (Expandable) */}
      {showOutletInfo && merchant.openingHours && (
        <div className="px-4 py-4 bg-bg-secondary border-b border-neutral-200">
          <h3 className="text-sm font-semibold text-primary-dark mb-3">Jam Operasional</h3>
          <div className="space-y-2">
            {merchant.openingHours
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((hours) => (
                <div
                  key={hours.id.toString()}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-[13px] font-medium text-primary-dark">
                    {dayNames[hours.dayOfWeek]}
                  </span>
                  <span className="text-[13px] text-secondary">
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

      {/* Mode Selection Section */}
      <div className="px-4 pt-6">
        {/* Title - 16px/600 */}
        <h2 className="text-base font-semibold text-primary-dark mb-4">
          Pilih Cara Makan
        </h2>
        
        {/* Button 1: Dine-in - 56px height, 100% width, 16px/600 */}
        <button
          onClick={() => handleModeSelect('dinein')}
          className="w-full h-14 bg-primary text-white rounded-lg font-semibold text-base mb-3 hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🍽️</span>
          Makan di Tempat
        </button>
        
        {/* Button 2: Takeaway - Same styling */}
        <button
          onClick={() => handleModeSelect('takeaway')}
          className="w-full h-14 bg-primary text-white rounded-lg font-semibold text-base hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🛍️</span>
          Ambil Sendiri
        </button>
      </div>

      {/* Description (if available) */}
      {merchant.description && (
        <div className="px-4 pt-6 pb-8">
          <h3 className="text-sm font-semibold text-primary-dark mb-2">Tentang Kami</h3>
          <p className="text-sm text-secondary leading-relaxed">
            {merchant.description}
          </p>
        </div>
      )}

      {/* Table Number Modal */}
      <TableNumberModal
        merchantCode={merchantCode}
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onConfirm={handleTableNumberConfirm}
      />
    </div>
  );
}

