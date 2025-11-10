'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCart, getCustomerAuth, saveCustomerAuth, clearCart, clearTableNumber } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import type { LocalCart } from '@/lib/types/cart';
import PaymentConfirmationModal from '@/components/modals/PaymentConfirmationModal';

/**
 * Payment Page - Redesigned
 * 
 * Based on FRONTEND_SPECIFICATION.md (Tasks 21-23):
 * - Fixed header 56px: back button, "Pembayaran" title
 * - Order mode badge: emoji + mode name, table number
 * - Customer info form: Name (required), Phone, Email
 * - Input fields: 48px height, proper labels 14px/600
 * - Payment info card: #FFF5F0 background, instructions
 * - Submit button: "Proses Pesanan" 48px #FF6B35
 * - Confirmation modal: (Task 24 - already created)
 * - Total display in summary card
 */
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [cart, setCart] = useState<LocalCart | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const auth = getCustomerAuth();

  useEffect(() => {
    const cartData = getCart(merchantCode);
    if (!cartData || cartData.items.length === 0) {
      router.push(`/${merchantCode}/home?mode=${mode}`);
      return;
    }
    setCart(cartData);

    // Auto-fill if logged in
    if (auth) {
      setName(auth.user.name);
      setEmail(auth.user.email);
      setPhone(auth.user.phone || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    // Validate required fields
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!cart) return;

    setIsLoading(true);
    setError('');
    setShowConfirmModal(false);

    try {
      // Step 1: Login/Register if not authenticated
      let accessToken = auth?.accessToken;
      
      if (!auth) {
        const authResponse = await fetch('/api/public/auth/customer-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim() || `guest_${Date.now()}@genfity.com`,
            name: name.trim(),
            phone: phone.trim() || undefined,
          }),
        });

        const authData = await authResponse.json();
        if (!authResponse.ok) {
          throw new Error(authData.message || 'Login gagal');
        }

        saveCustomerAuth({
          accessToken: authData.data.accessToken,
          user: authData.data.user,
          expiresAt: authData.data.expiresAt,
        });

        accessToken = authData.data.accessToken;
      }

      // Step 2: Create order
      const orderResponse = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          merchantCode: cart.merchantCode,
          mode: cart.mode,
          tableNumber: cart.tableNumber,
          customerName: name,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          items: cart.items.map((item) => ({
            menuId: item.menuId.toString(),
            quantity: item.quantity,
            notes: item.notes,
            addons: (item.addons || []).map((addon) => ({
              addonItemId: addon.id.toString(),
              quantity: 1, // LocalCartAddon doesn't have quantity
            })),
          })),
        }),
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'Gagal membuat pesanan');
      }

      // Clear cart and table number
      clearCart(merchantCode);
      clearTableNumber(merchantCode);

      // Redirect to order summary
      router.push(
        `/${merchantCode}/order-summary-cash?orderNumber=${orderData.data.orderNumber}&mode=${mode}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Rp${amount.toLocaleString('id-ID')}`;
  };

  if (!cart) {
    return null;
  }

  // Calculate item subtotal (price * quantity + addons)
  const calculateItemSubtotal = (item: LocalCart['items'][0]) => {
    const basePrice = item.price * item.quantity;
    const addonsPrice = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0) * item.quantity;
    return basePrice + addonsPrice;
  };

  // Calculate total
  const total = cart.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);

  return (
    <div className="min-h-screen bg-white pb-6">
      {/* Fixed Header - 56px */}
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-[100]">
        {/* Left: Back Button */}
        <Link href={`/${merchantCode}/view-order?mode=${mode}`} className="flex items-center gap-2 text-[#1A1A1A]">
          <span className="text-xl">←</span>
          <span className="text-sm font-medium">Kembali</span>
        </Link>

        {/* Center: Title */}
        <h1 className="text-base font-bold text-[#1A1A1A]">Pembayaran</h1>

        {/* Right: Placeholder for symmetry */}
        <div className="w-16" />
      </header>

      <main className="px-4 py-4">
        {/* Order Mode Badge */}
        <div className="mb-4 p-3 bg-[#FFF5F0] border border-[#FF6B35] rounded-lg flex items-center gap-3">
          <span className="text-2xl">{mode === 'dinein' ? '🍽️' : '🛍️'}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {mode === 'dinein' ? 'Makan di Tempat' : 'Ambil Sendiri'}
            </p>
            {cart.tableNumber && (
              <p className="text-xs text-[#666666]">Meja #{cart.tableNumber}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Customer Info Form */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">
            Informasi Pemesan
          </h2>
          
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: Muhammad Yoga Adi Saputra"
              />
            </div>

            {/* Phone Input */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Nomor Ponsel
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: 0896-6817-6764"
              />
              <p className="mt-1 text-xs text-[#999999]">Opsional - untuk info promo</p>
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35]"
                placeholder="Contoh: m.yogaadi1234@gmail.com"
              />
              <p className="mt-1 text-xs text-[#999999]">Opsional - untuk struk digital</p>
            </div>

            {/* Table Number (Read-only for dine-in) */}
            {mode === 'dinein' && cart.tableNumber && (
              <div>
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Nomor Meja <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={`Meja #${cart.tableNumber}`}
                  className="w-full h-12 px-4 border border-[#E0E0E0] rounded-lg text-sm text-[#666666] bg-[#F9F9F9]"
                />
              </div>
            )}
          </form>
        </div>

        {/* Payment Instructions Card */}
        <div className="mb-4 p-4 bg-[#FFF5F0] rounded-lg border border-[#FF6B35]">
          <div className="flex gap-3">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">
                Cara Pembayaran
              </h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Klik &quot;Proses Pesanan&quot; lalu tunjukkan kode QR ke kasir untuk pembayaran.
              </p>
            </div>
          </div>
        </div>

        {/* Total Summary Card */}
        <div className="mb-4 p-4 bg-[#F9F9F9] rounded-lg border border-[#E0E0E0]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#666666]">Total Pembayaran</p>
              <p className="text-xs text-[#999999] mt-0.5">{cart.items.length} item</p>
            </div>
            <span className="text-xl font-bold text-[#FF6B35]">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleFormSubmit}
          disabled={isLoading}
          className="w-full h-12 bg-[#FF6B35] text-white text-base font-semibold rounded-lg hover:bg-[#E55A2B] disabled:bg-[#E0E0E0] disabled:text-[#999999] disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isLoading ? 'Memproses...' : 'Proses Pesanan'}
        </button>
      </main>

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
        totalAmount={total}
      />
    </div>
  );
}
