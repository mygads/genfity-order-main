'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  getCart,
  updateCartItemQuantity,
  updateCartItemNotes,
  getCartTotal,
} from '@/lib/utils/localStorage';
import type { Cart, OrderMode } from '@/lib/types/customer';

/**
 * View Order Page (Cart Review)
 * - Display cart items with addon details
 * - Edit item notes
 * - Update quantity
 * - Show total and proceed to payment
 */
export default function ViewOrderPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [cart, setCart] = useState<Cart | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<number, string>>({});

  const loadCart = () => {
    const cartData = getCart(merchantCode);
    if (!cartData) {
      router.push(`/${merchantCode}/home?mode=${mode}`);
      return;
    }
    setCart(cartData);
    
    // Initialize notes
    const notes: Record<number, string> = {};
    cartData.items.forEach((item, index) => {
      notes[index] = item.notes || '';
    });
    setItemNotes(notes);
  };

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode]);

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    updateCartItemQuantity(merchantCode, index, newQuantity);
    loadCart();
  };

  const handleUpdateNotes = (index: number, notes: string) => {
    updateCartItemNotes(merchantCode, index, notes);
    setItemNotes({ ...itemNotes, [index]: notes });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!cart) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">⏳</div>
          <p className="mt-4 text-gray-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  const total = getCartTotal(merchantCode);
  const serviceFee = total * 0.1; // 10% service fee
  const grandTotal = total + serviceFee;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/${merchantCode}/home?mode=${mode}`}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Kembali
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Pesanan</h1>
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
          {cart.tableNumber && (
            <p className="mt-2 text-sm text-gray-600">
              Meja: <strong>{cart.tableNumber}</strong>
            </p>
          )}
        </div>

        {/* Order Items */}
        <div className="mb-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Item yang dipesan ({cart.items.length})
          </h2>
          <div className="space-y-4">
            {cart.items.map((item, index) => (
              <div key={index} className="overflow-hidden rounded-2xl bg-white shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{item.menuName}</h3>
                      {item.addons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {item.addons.map((addon, addonIndex) => (
                            <p key={addonIndex} className="text-sm text-gray-600">
                              {addon.quantity}x {addon.name} ({formatCurrency(addon.price)})
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="mt-3">
                        <input
                          type="text"
                          value={itemNotes[index] || ''}
                          onChange={(e) => handleUpdateNotes(index, e.target.value)}
                          placeholder="Tambah catatan (contoh: pedas, tanpa bawang)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(item.subtotal)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="font-bold text-gray-900">Rincian Pembayaran</h2>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Termasuk biaya lainnya</span>
              <span>{formatCurrency(serviceFee)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white p-4 shadow-2xl">
        <div className="mx-auto max-w-4xl">
          <Link
            href={`/${merchantCode}/payment?mode=${mode}`}
            className="flex w-full items-center justify-between rounded-2xl bg-orange-500 px-6 py-4 text-white transition hover:bg-orange-600"
          >
            <span className="text-lg font-bold">Lanjut ke Pembayaran</span>
            <span className="text-xl font-bold">{formatCurrency(grandTotal)}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
