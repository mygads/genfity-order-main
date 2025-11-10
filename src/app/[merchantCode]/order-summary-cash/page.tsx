'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { OrderMode } from '@/lib/types/customer';

interface OrderSummaryData {
  id: bigint;
  orderNumber: string;
  merchantName: string;
  customerName: string;
  mode: OrderMode;
  tableNumber: string | null;
  status: string;
  items: Array<{
    menuName: string;
    quantity: number;
    price: number;
    subtotal: number;
    notes: string | null;
    addons: Array<{
      addonItemName: string;
      quantity: number;
      price: number;
    }>;
  }>;
  subtotalAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  createdAt: string;
}

/**
 * Order Summary Cash Page
 * - Display QR code for payment at cashier
 * - Show order number (8 digits)
 * - Display order items with addons
 * - Show total amount
 */
export default function OrderSummaryCashPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const orderNumber = searchParams.get('orderNumber') || '';
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [order, setOrder] = useState<OrderSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrderSummary = async () => {
      if (!orderNumber) {
        setError('Nomor pesanan tidak ditemukan');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/public/orders/${orderNumber}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Gagal memuat pesanan');
        }

        // Convert BigInt IDs
        const orderData = {
          ...data.data,
          id: BigInt(data.data.id),
        };

        setOrder(orderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrderSummary();
  }, [orderNumber]);

  const handleNewOrder = () => {
    router.push(`/${merchantCode}/home?mode=${mode}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 text-6xl">⏳</div>
          <p className="text-gray-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            Pesanan tidak ditemukan
          </h1>
          <p className="mb-6 text-gray-600">{error || 'Nomor pesanan tidak valid'}</p>
          <Link
            href={`/${merchantCode}`}
            className="rounded-lg bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-center">
            <h1 className="text-lg font-bold text-gray-900">Pesanan Berhasil</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Success Message */}
        <div className="mb-6 rounded-2xl bg-green-50 p-6 text-center">
          <div className="mb-2 text-6xl">✅</div>
          <h2 className="mb-1 text-xl font-bold text-green-900">Pesanan Berhasil!</h2>
          <p className="text-sm text-green-700">
            Tunjukkan QR Code ke kasir untuk pembayaran
          </p>
        </div>

        {/* QR Code */}
        <div className="mb-6 rounded-2xl bg-white p-6 text-center shadow">
          <div className="mb-4 flex justify-center">
            {/* Placeholder QR Code - In production, use actual QR library */}
            <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-gray-100">
              <div className="text-center">
                <div className="mb-2 text-6xl">📱</div>
                <p className="text-sm text-gray-600">QR Code</p>
                <p className="font-mono text-lg font-bold text-gray-900">
                  {order.orderNumber}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-600">Nomor Pesanan</p>
            <p className="font-mono text-2xl font-bold text-gray-900">
              {order.orderNumber}
            </p>
          </div>
        </div>

        {/* Order Details */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <h3 className="mb-4 font-bold text-gray-900">Detail Pesanan</h3>
          
          <div className="mb-4 space-y-2 border-b border-gray-200 pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Merchant</span>
              <span className="font-semibold text-gray-900">{order.merchantName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Nama Pemesan</span>
              <span className="font-semibold text-gray-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tipe Pesanan</span>
              <span className="font-semibold text-gray-900">
                {order.mode === 'dinein' ? '🍽️ Makan di tempat' : '🛍️ Ambil sendiri'}
              </span>
            </div>
            {order.tableNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Nomor Meja</span>
                <span className="font-semibold text-gray-900">{order.tableNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Status</span>
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                {order.status}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Item Pesanan</h4>
            {order.items.map((item, idx) => (
              <div key={idx} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="mb-2 flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.menuName}</p>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x {formatCurrency(item.price)}
                    </p>
                    {item.notes && (
                      <p className="mt-1 text-sm italic text-gray-500">
                        📝 {item.notes}
                      </p>
                    )}
                    {item.addons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.addons.map((addon, addonIdx) => (
                          <p key={addonIdx} className="text-sm text-gray-600">
                            + {addon.addonItemName} ({addon.quantity}x) - {formatCurrency(addon.price)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Summary */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow">
          <div className="space-y-2 border-b border-gray-200 pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(order.subtotalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Biaya Layanan (10%)</span>
              <span className="text-gray-900">{formatCurrency(order.serviceFeeAmount)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-orange-600">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl bg-orange-50 p-6">
          <h3 className="mb-3 font-bold text-orange-900">Langkah Selanjutnya</h3>
          <ol className="space-y-2 text-sm text-orange-800">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Tunjukkan QR code atau nomor pesanan ke kasir</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Lakukan pembayaran di kasir</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Tunggu pesanan Anda dipanggil</span>
            </li>
          </ol>
        </div>
      </main>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={handleNewOrder}
            className="w-full rounded-lg bg-orange-500 px-6 py-4 font-bold text-white transition hover:bg-orange-600"
          >
            🍽️ Pesan Baru
          </button>
        </div>
      </div>
    </div>
  );
}
