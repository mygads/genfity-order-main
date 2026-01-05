'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { MenuItem, CartAddon } from '@/lib/types/customer';

/**
 * Menu Detail Modal Component - Burjo ESB Style
 * 
 * Full-screen modal matching Burjo ESB exactly:
 * - Full viewport coverage
 * - Image with rounded TOP corners
 * - Close button top-right
 * - Add-on sections with orange required labels
 * - Sticky footer with gray bg, quantity selector, and orange Add button
 * - Currency formatted as A$
 */
interface MenuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menu: MenuItem | null;
  currency?: string;
  onAddToCart: (menuId: bigint, quantity: number, notes: string, addons: CartAddon[]) => void;
}

export default function MenuDetailModal({
  isOpen,
  onClose,
  menu,
  currency = 'AUD',
  onAddToCart,
}: MenuDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<Set<bigint>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  // Format currency - A$ for AUD
  const formatPrice = (amount: number): string => {
    if (currency === 'AUD' || currency === 'A$') {
      return `A$${amount.toFixed(2)}`;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNotes('');
      setSelectedAddons(new Set());
      setIsExpanded(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !menu) return null;

  const handleToggleAddon = (addonId: bigint) => {
    const newSet = new Set(selectedAddons);
    if (newSet.has(addonId)) {
      newSet.delete(addonId);
    } else {
      newSet.add(addonId);
    }
    setSelectedAddons(newSet);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 200) {
      setNotes(value);
    }
  };

  const calculateTotal = (): number => {
    let total = menu.price * quantity;

    if (menu.addonCategories && menu.addonCategories.length > 0) {
      let addonsPrice = 0;
      menu.addonCategories.forEach((category) => {
        category.items.forEach((item) => {
          if (selectedAddons.has(item.id)) {
            addonsPrice += item.price;
          }
        });
      });
      total += addonsPrice * quantity;
    }

    return total;
  };

  const handleSubmit = () => {
    if (!menu.isAvailable) return;

    const cartAddons: CartAddon[] = [];
    if (menu.addonCategories && menu.addonCategories.length > 0) {
      menu.addonCategories.forEach((category) => {
        category.items.forEach((item) => {
          if (selectedAddons.has(item.id)) {
            cartAddons.push({
              id: BigInt(0),
              addonItemId: item.id,
              name: item.name,
              price: item.price,
              quantity: 1,
            });
          }
        });
      });
    }

    onAddToCart(menu.id, quantity, notes.trim(), cartAddons);
    onClose();
  };

  const total = calculateTotal();
  const hasAddons = menu.addonCategories && menu.addonCategories.length > 0;

  return (
    <>
      {/* Full Screen Modal - Burjo ESB Style */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#ffffff',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Scrollable Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '80px', // Space for footer
          }}
        >
          {/* Image Section - Rounded TOP corners only */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '220px',
              backgroundColor: '#f3f4f6',
            }}
          >
            {menu.imageUrl ? (
              <Image
                src={menu.imageUrl}
                alt={menu.name}
                fill
                className="object-cover"
                sizes="100vw"
                style={{ borderRadius: '0 0 16px 16px' }}
                quality={100}
                unoptimized
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #F05A28 0%, #ff8c42 100%)',
                  borderRadius: '0 0 16px 16px',
                }}
              >
                <span style={{ fontSize: '80px' }}>🍜</span>
              </div>
            )}

            {/* Close Button - Top Right */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="#333" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>

            {/* Expand Button - Below Close */}
            {menu.imageUrl && (
              <button
                onClick={() => setIsExpanded(true)}
                style={{
                  position: 'absolute',
                  top: '64px',
                  right: '16px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
                aria-label="Expand Image"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 7V3h4M17 7V3h-4M3 13v4h4M17 13v4h-4" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Unavailable Badge */}
            {!menu.isAvailable && (
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Tidak Tersedia
              </div>
            )}
          </div>

          {/* Content Area */}
          <div style={{ padding: '16px' }}>
            {/* Menu Name - 18px/700 */}
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                color: '#000',
                marginBottom: '8px',
                lineHeight: '1.4',
              }}
            >
              {menu.name}
            </h2>

            {/* Price - 16px/600 */}
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#000',
                }}
              >
                {formatPrice(menu.price)}
              </span>
            </div>

            {/* Description - 14px/400 */}
            {menu.description && (
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#666',
                  lineHeight: '1.5',
                  marginBottom: '16px',
                }}
              >
                {menu.description}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: '8px', backgroundColor: '#f5f5f5', margin: '0 -16px', marginBottom: '16px' }} />

            {/* Add-ons Section */}
            {hasAddons && (
              <div>
                {menu.addonCategories!.map((category) => (
                  <div key={category.id.toString()} style={{ marginBottom: '20px' }}>
                    {/* Category Header */}
                    <div style={{ marginBottom: '12px' }}>
                      <h3
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#000',
                          marginBottom: '4px',
                        }}
                      >
                        {category.name}
                      </h3>
                      {/* Required Label - Orange */}
                      {category.minSelection > 0 && (
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#F05A28',
                          }}
                        >
                          Must be selected
                        </span>
                      )}
                      {category.maxSelection > 0 && category.minSelection === 0 && (
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            fontWeight: 400,
                            color: '#999',
                          }}
                        >
                          Max. {category.maxSelection}
                        </span>
                      )}
                    </div>

                    {/* Addon Items */}
                    <div>
                      {category.items.map((item, index) => {
                        const isUnavailable = !item.isAvailable || (item.trackStock && item.stockQty !== undefined && item.stockQty <= 0);

                        return (
                          <div
                            key={item.id.toString()}
                            onClick={() => !isUnavailable && handleToggleAddon(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '14px 0',
                              borderBottom: index < category.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                              cursor: isUnavailable ? 'not-allowed' : 'pointer',
                              opacity: isUnavailable ? 0.5 : 1,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span
                                style={{
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 400,
                                  color: '#000',
                                  textDecoration: isUnavailable ? 'line-through' : 'none',
                                }}
                              >
                                {item.name}
                              </span>
                              {item.price > 0 && (
                                <span
                                  style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: 400,
                                    color: '#666',
                                    marginLeft: '8px',
                                  }}
                                >
                                  (+{formatPrice(item.price)})
                                </span>
                              )}
                              {isUnavailable && (
                                <span
                                  style={{
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: '12px',
                                    color: '#ef4444',
                                    marginLeft: '8px',
                                  }}
                                >
                                  Sold out
                                </span>
                              )}
                            </div>
                            {/* Checkbox */}
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '4px',
                                border: selectedAddons.has(item.id) ? '2px solid #F05A28' : '2px solid #ddd',
                                backgroundColor: selectedAddons.has(item.id) ? '#F05A28' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s',
                                flexShrink: 0,
                              }}
                            >
                              {selectedAddons.has(item.id) && (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M11.5 4L5.5 10L2.5 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes Section */}
            <div style={{ marginTop: '8px' }}>
              {/* Divider before notes */}
              <div style={{ height: '8px', backgroundColor: '#f5f5f5', margin: '0 -16px', marginBottom: '16px' }} />

              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#000',
                  marginBottom: '8px',
                }}
              >
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="E.g., No chili, extra sauce..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#000',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  color: '#999',
                  textAlign: 'right',
                  marginTop: '4px',
                }}
              >
                {notes.length}/200
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer - Burjo Style */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#F5F5F5',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #e0e0e0',
            zIndex: 410,
          }}
        >
          {/* Left: Total Order + Quantity Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#666',
              }}
            >
              Total Order
            </span>
            {/* Quantity Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: quantity <= 1 ? '2px solid #ddd' : '2px solid #F05A28',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8H12" stroke={quantity <= 1 ? '#ddd' : '#F05A28'} strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#000',
                  minWidth: '24px',
                  textAlign: 'center',
                }}
              >
                {quantity}
              </span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= 99}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid #F05A28',
                  backgroundColor: '#F05A28',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: quantity >= 99 ? 'not-allowed' : 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 4V12M4 8H12" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: Add Orders Button */}
          <button
            onClick={handleSubmit}
            disabled={!menu.isAvailable}
            style={{
              backgroundColor: menu.isAvailable ? '#F05A28' : '#E0E0E0',
              color: menu.isAvailable ? 'white' : '#999',
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: menu.isAvailable ? 'pointer' : 'not-allowed',
              minWidth: '130px',
            }}
          >
            Add {formatPrice(total)}
          </button>
        </div>
      </div>

      {/* Expanded Image Lightbox */}
      {isExpanded && menu.imageUrl && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {/* Close button hint */}
          <button
            onClick={() => setIsExpanded(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 510,
            }}
            aria-label="Close expanded view"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Full Quality Image - stops propagation to prevent closing when clicking image */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '80vh',
              cursor: 'default',
            }}
          >
            <Image
              src={menu.imageUrl}
              alt={menu.name}
              width={800}
              height={600}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              quality={100}
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  );
}
