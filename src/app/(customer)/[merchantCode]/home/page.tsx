'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  addToCart,
  getTableNumber,
} from '@/lib/utils/localStorage';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import type { MenuItem, OrderMode, CartAddon } from '@/lib/types/customer';
import FloatingCartButton from '@/components/cart/FloatingCartButton';
import TableNumberModal from '@/components/modals/TableNumberModal';
import MenuDetailModal from '@/components/modals/MenuDetailModal';

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
 * Menu Browsing Page - Redesigned
 * 
 * Based on FRONTEND_SPECIFICATION.md:
 * - Fixed header 56px (back, merchant name, search/menu icons)
 * - Table badge for dine-in (Meja #X, #FFF5F0 background)
 * - Mode indicator tabs (Makan di Tempat / Ambil Sendiri, active #FF6B35 border-bottom 3px)
 * - Horizontal scrolling categories (48px height, scroll-snap)
 * - Menu items flex-row (image 70x70px, name 14px/600, price 16px/700)
 * - Floating cart button (110x64px, bottom-right)
 * - Table number modal for dine-in
 */
export default function MenuBrowsingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState('');
  const [showTableModal, setShowTableModal] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);
  const [showMenuDetail, setShowMenuDetail] = useState(false);
  
  const _auth = getCustomerAuth();

  const fetchMenuData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/public/menu/${merchantCode}`);
      if (response.ok) {
        const data = await response.json();
        setMerchant(data.data.merchant);
        setMenuItems(data.data.items || []);
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkTableNumber = () => {
    if (mode === 'dinein') {
      const saved = getTableNumber(merchantCode);
      if (saved) {
        setTableNumber(saved.tableNumber);
      } else {
        // Auto-show modal if no table number
        setShowTableModal(true);
      }
    }
  };

  useEffect(() => {
    fetchMenuData();
    checkTableNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode, mode]);

  const handleMenuClick = (menu: MenuItem) => {
    setSelectedMenu(menu);
    setShowMenuDetail(true);
  };

  const handleAddToCartFromModal = (
    menuId: bigint,
    quantity: number,
    notes: string,
    addons: CartAddon[]
  ) => {
    if (!merchant || !selectedMenu) return;

    // Calculate subtotal
    const basePrice = selectedMenu.price * quantity;
    const addonsPrice = addons.reduce((sum: number, addon: CartAddon) => sum + addon.price * quantity, 0);
    const subtotal = basePrice + addonsPrice;

    const cartItem = {
      menuId,
      menuName: selectedMenu.name,
      price: selectedMenu.price,
      quantity,
      notes,
      addons,
      subtotal,
    };

    addToCart(
      merchantCode,
      merchant.id,
      mode,
      cartItem,
      mode === 'dinein' ? tableNumber : undefined
    );

    // Trigger storage event for floating cart
    window.dispatchEvent(new Event('cartUpdated'));
    
    // Close modal
    setShowMenuDetail(false);
    setSelectedMenu(null);
  };

  const handleSwitchMode = (newMode: OrderMode) => {
    router.push(`/${merchantCode}/home?mode=${newMode}`);
  };

  const handleSaveTableNumber = (num: number) => {
    setTableNumber(num.toString());
  };

  const filteredMenus = selectedCategory
    ? menuItems.filter((m) => m.categoryName === selectedCategory)
    : menuItems;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-[#666666]">Memuat menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Fixed Header - 56px */}
      <header className="h-14 bg-white border-b border-[#E0E0E0] px-4 flex items-center justify-between sticky top-0 z-[100]">
        {/* Left: Back Button */}
        <Link href={`/${merchantCode}`} className="flex items-center gap-2 text-[#1A1A1A]">
          <span className="text-xl">←</span>
        </Link>

        {/* Center: Merchant Name + Table Badge */}
        <div className="flex flex-col items-center flex-1 mx-4">
          <span className="text-base font-semibold text-[#1A1A1A]">
            {merchant?.name || merchantCode}
          </span>
          {/* Table Badge for Dine-in */}
          {mode === 'dinein' && tableNumber && (
            <button
              onClick={() => setShowTableModal(true)}
              className="mt-0.5 px-3 py-0.5 bg-[#FFF5F0] text-[#FF6B35] text-[13px] font-semibold rounded-full"
            >
              Meja #{tableNumber}
            </button>
          )}
        </div>

        {/* Right: Search + Menu Icons */}
        <div className="flex items-center gap-4">
          <button className="text-xl">🔍</button>
          <button className="text-xl">☰</button>
        </div>
      </header>

      {/* Mode Indicator Tabs - 48px height */}
      <div className="h-12 bg-white border-b border-[#E0E0E0] flex sticky top-14 z-[90]">
        {/* Tab: Makan di Tempat */}
        <button
          onClick={() => handleSwitchMode('dinein')}
          className={`flex-1 flex flex-col items-center justify-center text-sm font-medium transition-colors ${
            mode === 'dinein'
              ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
              : 'text-[#999999] border-b-[3px] border-transparent'
          }`}
        >
          <span>Makan di Tempat</span>
          <span className="text-xs text-[#666666]">Diambil Sekarang</span>
        </button>

        {/* Tab: Ambil Sendiri */}
        <button
          onClick={() => handleSwitchMode('takeaway')}
          className={`flex-1 flex flex-col items-center justify-center text-sm font-medium transition-colors ${
            mode === 'takeaway'
              ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
              : 'text-[#999999] border-b-[3px] border-transparent'
          }`}
        >
          <span>Ambil Sendiri</span>
          <span className="text-xs text-[#666666]">Ambil Nanti</span>
        </button>
      </div>

      {/* Categories - Horizontal Scroll - 48px height */}
      {categories.length > 0 && (
        <div className="h-12 bg-white border-b border-[#E0E0E0] overflow-x-auto scrollbar-hide sticky top-[104px] z-[80]">
          <div className="flex h-full px-2" style={{ scrollSnapType: 'x mandatory' }}>
            {/* Category: Semua */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 px-5 text-sm font-medium transition-all ${
                selectedCategory === null
                  ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
                  : 'text-[#666666] border-b-[3px] border-transparent'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              Semua
            </button>

            {/* Dynamic Categories */}
            {categories.map((category) => (
              <button
                key={category.id.toString()}
                onClick={() => setSelectedCategory(category.name)}
                className={`flex-shrink-0 px-5 text-sm font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.name
                    ? 'text-[#FF6B35] border-b-[3px] border-[#FF6B35]'
                    : 'text-[#666666] border-b-[3px] border-transparent'
                }`}
                style={{ scrollSnapAlign: 'start' }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items List */}
      <main className="px-4 py-4">
        {filteredMenus.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-[#666666]">Belum ada menu tersedia</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMenus.map((menu) => (
              <div
                key={menu.id.toString()}
                className="flex gap-3 bg-white border border-[#E0E0E0] rounded-lg p-3"
              >
                {/* Image - 70x70px */}
                <div className="flex-shrink-0 w-[70px] h-[70px] bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center text-3xl">
                  🍜
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Name - 14px/600 */}
                  <h3 className="text-sm font-semibold text-[#1A1A1A] line-clamp-2 mb-1">
                    {menu.name}
                  </h3>

                  {/* Description - 12px/400 */}
                  {menu.description && (
                    <p className="text-xs text-[#666666] line-clamp-2 mb-2">
                      {menu.description}
                    </p>
                  )}

                  {/* Price - 16px/700 */}
                  <p className="text-base font-bold text-[#FF6B35]">
                    Rp{menu.price.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Action Button - 70x36px */}
                <div className="flex-shrink-0 flex items-end">
                  {menu.isAvailable ? (
                    <button
                      onClick={() => handleMenuClick(menu)}
                      className="w-[70px] h-9 bg-[#FF6B35] text-white text-sm font-semibold rounded-md hover:bg-[#E55A2B] transition-all active:scale-95"
                    >
                      Tambah
                    </button>
                  ) : (
                    <div className="w-[70px] h-9 bg-[#F5F5F5] text-[#999999] text-xs font-semibold rounded-md flex items-center justify-center">
                      Habis
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Cart Button - 110x64px, bottom-right */}
      <FloatingCartButton merchantCode={merchantCode} />

      {/* Table Number Modal */}
      <TableNumberModal
        merchantCode={merchantCode}
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onSave={handleSaveTableNumber}
      />

      {/* Menu Detail Modal */}
      <MenuDetailModal
        isOpen={showMenuDetail}
        onClose={() => {
          setShowMenuDetail(false);
          setSelectedMenu(null);
        }}
        menu={selectedMenu}
        onAddToCart={handleAddToCartFromModal}
      />

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
