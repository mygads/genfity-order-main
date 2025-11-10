'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getCart, getCustomerAuth, saveCustomerAuth, clearCart, clearTableNumber } from '@/lib/utils/localStorage';
import type { Cart, OrderMode } from '@/lib/types/customer';

/**
 * Payment Page
 * - Display user info form (auto-filled if logged in)
 * - Seamless register/login (email as primary identifier)
 * - Table number display for dine-in
 * - Create order and redirect to summary
 */
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Login/Register if not authenticated
      let accessToken = auth?.accessToken;
      
      if (!auth) {
        const authResponse = await fetch('/api/public/auth/customer-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
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
          merchantId: cart.merchantId.toString(),
          mode: cart.mode,
          tableNumber: cart.tableNumber,
          customerName: name,
          customerEmail: email,
          customerPhone: phone || undefined,
          items: cart.items.map((item) => ({
            menuId: item.menuId.toString(),
            quantity: item.quantity,
            notes: item.notes,
            addons: item.addons.map((addon) => ({
              addonItemId: addon.addonItemId.toString(),
              quantity: addon.quantity,
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
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!cart) {
    return null;
  }

  const total = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
  const serviceFee = total * 0.1;
  const grandTotal = total + serviceFee;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/${merchantCode}/view-order?mode=${mode}`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Kembali
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Pembayaran</h1>
            <div className="w-16" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Order Type */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="font-bold text-gray-900">Tipe Pemesanan</h2>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl">{mode === 'dinein' ? '🍽️' : '🛍️'}</span>
            <span className="font-semibold text-gray-700">
              {mode === 'dinein' ? 'Makan di tempat' : 'Ambil sendiri'}
            </span>
          </div>
        </div>

        {/* Customer Info Form */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Informasi Pemesan</h2>
          
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Muhammad Yoga Adi Saputra"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Nomor Ponsel (untuk info promo)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="0896-6817-6764"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Kirim struk ke email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="m.yogaadi1234@gmail.com"
              />
            </div>

            {mode === 'dinein' && cart.tableNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nomor Meja <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={cart.tableNumber}
                  className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-600"
                />
              </div>
            )}

            <div className="rounded-lg bg-orange-50 p-4">
              <p className="text-sm text-orange-800">
                💡 Klik &apos;Bayar di Kasir&apos; lalu tunjukkan QR ke kasir.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Memproses...' : `Bayar di Kasir - ${formatCurrency(grandTotal)}`}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
