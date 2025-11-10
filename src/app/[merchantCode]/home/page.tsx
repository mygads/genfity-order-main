'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  addToCart,
  getCartItemCount,
  getCartTotal,
  getTableNumber,
  saveTableNumber,
} from '@/lib/utils/localStorage';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import type { MenuItem, OrderMode, CartAddon } from '@/lib/types/customer';

interface MerchantData {
  id: bigint;
  name: string;
  code: string;
}

interface CategoryData {
  id: bigint;
  name: string;
  displayOrder: number;
}

/**
 * Menu Browsing Page
 * - Display menu categories & items
 * - Table number input for dine-in
 * - Add to cart with addons
 * - Cart summary (sticky bottom)
 */
export default function MenuBrowsingPage() {
  const params = useParams();
  const _router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableNumber, setTableNumberState] = useState('');
  const [showTableInput, setShowTableInput] = useState(mode === 'dinein');
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  
  const auth = getCustomerAuth();

  const fetchMenuData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/public/merchants/${merchantCode}/menu`);
      if (response.ok) {
        const data = await response.json();
        setMerchant(data.data.merchant);
        setMenuItems(data.data.menus || []);
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTableNumber = () => {
    if (mode === 'dinein') {
      const saved = getTableNumber(merchantCode);
      if (saved) {
        setTableNumberState(saved.tableNumber);
        setShowTableInput(false);
      }
    }
  };

  const updateCartDisplay = () => {
    setCartCount(getCartItemCount(merchantCode));
    setCartTotal(getCartTotal(merchantCode));
  };

  const handleSaveTableNumber = () => {
    if (tableNumber.trim()) {
      saveTableNumber(merchantCode, tableNumber.trim());
      setShowTableInput(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
    loadTableNumber();
    updateCartDisplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode]);

  const handleAddToCart = (menu: MenuItem) => {
    if (!merchant) return;

    // For now, add without addons (simplified version)
    // In full version, should open modal for addon selection
    const cartItem = {
      menuId: menu.id,
      menuName: menu.name,
      price: menu.price,
      quantity: 1,
      notes: '',
      addons: [] as CartAddon[],
      subtotal: menu.price,
    };

    addToCart(
      merchantCode,
      merchant.id,
      mode,
      cartItem,
      mode === 'dinein' ? tableNumber : undefined
    );

    updateCartDisplay();
  };

  const filteredMenus = selectedCategory
    ? menuItems.filter((m) => m.categoryName === selectedCategory)
    : menuItems;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-5xl">⏳</div>
          <p className="mt-4 text-gray-600">Memuat menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href={`/${merchantCode}`} className="text-sm text-gray-600 hover:text-gray-900">
              ← {merchant?.name || merchantCode}
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href={auth ? `/profile?merchant=${merchantCode}&mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/home?mode=${mode}`)}` : `/login?merchant=${merchantCode}&mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/home?mode=${mode}`)}`}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {auth ? '👤' : '🔓'} {auth ? 'Profile' : 'Login'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Mode Badge */}
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-800">
            <span>{mode === 'dinein' ? '🍽️' : '🛍️'}</span>
            <span>{mode === 'dinein' ? 'Makan di Tempat' : 'Ambil Sendiri'}</span>
          </div>
          <Link
            href={`/${merchantCode}#outlet`}
            className="text-sm text-orange-500 hover:underline"
          >
            ℹ️ Info Outlet
          </Link>
        </div>

        {/* Table Number Input (Dine-in only) */}
        {mode === 'dinein' && showTableInput && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="font-bold text-gray-900">Nomor Meja</h3>
            <p className="mt-1 text-sm text-gray-600">Masukkan nomor meja Anda</p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumberState(e.target.value)}
                placeholder="Contoh: 21"
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleSaveTableNumber}
                disabled={!tableNumber.trim()}
                className="rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        )}

        {mode === 'dinein' && !showTableInput && tableNumber && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
            <span className="text-sm text-green-800">
              ✅ Meja: <strong>{tableNumber}</strong>
            </span>
            <button
              onClick={() => setShowTableInput(true)}
              className="text-sm text-green-600 hover:underline"
            >
              Ubah
            </button>
          </div>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === null
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Semua
              </button>
              {categories.map((category) => (
                <button
                  key={category.id.toString()}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category.name
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        {filteredMenus.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow">
            <div className="text-6xl">🍽️</div>
            <p className="mt-4 text-gray-600">Belum ada menu tersedia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMenus.map((menu) => (
              <div
                key={menu.id.toString()}
                className="overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-lg"
              >
                <div className="p-4">
                  <div className="flex gap-4">
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-3xl text-white">
                      🍜
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{menu.name}</h3>
                      {menu.description && (
                        <p className="mt-1 text-sm text-gray-600">{menu.description}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-lg font-bold text-orange-500">
                          {formatCurrency(menu.price)}
                        </p>
                        {menu.isAvailable ? (
                          <button
                            onClick={() => handleAddToCart(menu)}
                            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                          >
                            + Tambah
                          </button>
                        ) : (
                          <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500">
                            Habis
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white p-4 shadow-2xl">
          <div className="mx-auto max-w-4xl">
            <Link
              href={`/${merchantCode}/view-order?mode=${mode}`}
              className="flex items-center justify-between rounded-2xl bg-orange-500 px-6 py-4 text-white transition hover:bg-orange-600"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-orange-500">
                  {cartCount}
                </span>
                <span className="font-semibold">Lihat Pesanan</span>
              </div>
              <span className="text-lg font-bold">{formatCurrency(cartTotal)}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
