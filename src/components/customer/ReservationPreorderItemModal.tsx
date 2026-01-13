'use client';

import { useMemo, useState } from 'react';
import { FaTimes, FaMinus, FaPlus, FaExclamationTriangle } from 'react-icons/fa';

export type ReservationAddonInputType = 'SELECT' | 'QTY' | 'checkbox' | 'quantity';

export interface ReservationPreorderAddonItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  inputType?: ReservationAddonInputType | null;
  trackStock?: boolean;
  stockQty?: number | null;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ReservationPreorderAddonCategory {
  id: string;
  name: string;
  description?: string | null;
  minSelection?: number;
  maxSelection?: number | null;
  isRequired?: boolean;
  displayOrder?: number;
  addonItems: ReservationPreorderAddonItem[];
}

export interface ReservationPreorderMenuItem {
  id: string;
  name: string;
  addonCategories?: ReservationPreorderAddonCategory[];
}

function isQtyInputType(inputType: unknown): boolean {
  return inputType === 'QTY' || inputType === 'quantity';
}

function isSelectInputType(inputType: unknown): boolean {
  return inputType === 'SELECT' || inputType === 'checkbox' || inputType === undefined || inputType === null;
}

function getAddonAvailability(addon: ReservationPreorderAddonItem): boolean {
  const active = addon.isActive !== false;
  if (!active) return false;
  if (addon.trackStock) {
    const qty = addon.stockQty ?? 0;
    return qty > 0;
  }
  return true;
}

function getCategoryCount(category: ReservationPreorderAddonCategory, addonQty: Record<string, number>): number {
  const items = category.addonItems || [];
  const treatAsQty = items.some((a) => isQtyInputType(a.inputType));

  if (treatAsQty) {
    return items.reduce((sum, a) => sum + (addonQty[a.id] || 0), 0);
  }

  return items.reduce((sum, a) => sum + ((addonQty[a.id] || 0) > 0 ? 1 : 0), 0);
}

function validateCategory(category: ReservationPreorderAddonCategory, addonQty: Record<string, number>): string | null {
  const minSelection = Math.max(0, Number(category.minSelection ?? 0));
  const maxSelection = category.maxSelection === null ? null : Number(category.maxSelection ?? 0);
  const count = getCategoryCount(category, addonQty);

  if (count < minSelection) {
    return `Please select at least ${minSelection} item(s) in "${category.name}".`;
  }

  if (maxSelection !== null && maxSelection > 0 && count > maxSelection) {
    return `Please select no more than ${maxSelection} item(s) in "${category.name}".`;
  }

  return null;
}

export default function ReservationPreorderItemModal(props: {
  isOpen: boolean;
  menu: ReservationPreorderMenuItem;
  currency: string;
  initialNotes?: string;
  initialAddonQty?: Record<string, number>;
  onClose: () => void;
  onSave: (result: { notes: string; addonQty: Record<string, number> }) => void;
}) {
  const categories = useMemo(() => {
    const raw = props.menu.addonCategories || [];
    return [...raw].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [props.menu.addonCategories]);

  const [notes, setNotes] = useState(props.initialNotes ?? '');
  const [addonQty, setAddonQty] = useState<Record<string, number>>(props.initialAddonQty ?? {});
  const [error, setError] = useState<string>('');

  const formatPrice = (amount: number): string => {
    if (props.currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
    }
    const symbol = props.currency === 'AUD' ? 'A$' : props.currency === 'USD' ? '$' : props.currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const setAddonQuantity = (addonId: string, nextQty: number) => {
    setAddonQty((prev) => {
      const qty = Math.max(0, Math.min(99, nextQty));
      const next = { ...prev };
      if (qty <= 0) {
        delete next[addonId];
        return next;
      }
      next[addonId] = qty;
      return next;
    });
  };

  const toggleSelectAddon = (category: ReservationPreorderAddonCategory, addonId: string) => {
    const maxSelection = category.maxSelection === null ? null : Number(category.maxSelection ?? 0);
    const isSingleSelect = maxSelection === 1;

    setAddonQty((prev) => {
      const next = { ...prev };
      const currentSelected = (next[addonId] || 0) > 0;

      if (currentSelected) {
        delete next[addonId];
        return next;
      }

      if (isSingleSelect) {
        // Clear any other addon in this category
        for (const item of category.addonItems) {
          delete next[item.id];
        }
        next[addonId] = 1;
        return next;
      }

      const currentCount = getCategoryCount(category, next);
      if (maxSelection !== null && maxSelection > 0 && currentCount >= maxSelection) {
        return next; // ignore
      }

      next[addonId] = 1;
      return next;
    });
  };

  const trySave = () => {
    setError('');
    for (const cat of categories) {
      const msg = validateCategory(cat, addonQty);
      if (msg) {
        setError(msg);
        return;
      }
    }

    props.onSave({ notes: notes.trim(), addonQty });
  };

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50">
      <div className="w-full max-w-[480px] rounded-t-2xl bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Customize</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{props.menu.name}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <FaExclamationTriangle className="mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-4 space-y-4">
            {categories.map((cat) => {
              const minSel = Math.max(0, Number(cat.minSelection ?? 0));
              const maxSel = cat.maxSelection === null ? null : Number(cat.maxSelection ?? 0);
              const count = getCategoryCount(cat, addonQty);

              return (
                <div key={cat.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Min {minSel} / Max {maxSel === null || maxSel === 0 ? '∞' : maxSel} • Selected {count}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {cat.addonItems
                      .slice()
                      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                      .map((addon) => {
                        const available = getAddonAvailability(addon);
                        const qty = addonQty[addon.id] || 0;
                        const inputType = addon.inputType;

                        return (
                          <div
                            key={addon.id}
                            className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${available ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900' : 'border-gray-100 bg-gray-50 opacity-60 dark:border-gray-800 dark:bg-gray-900/40'}`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{addon.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatPrice(Number(addon.price || 0))}
                                {addon.description ? ` • ${addon.description}` : ''}
                              </p>
                            </div>

                            {isQtyInputType(inputType) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={!available || qty <= 0}
                                  onClick={() => setAddonQuantity(addon.id, qty - 1)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                >
                                  <FaMinus />
                                </button>
                                <div className="w-9 text-center text-sm font-semibold text-gray-900 dark:text-white">{qty}</div>
                                <button
                                  type="button"
                                  disabled={!available}
                                  onClick={() => {
                                    const maxSelection = cat.maxSelection === null ? null : Number(cat.maxSelection ?? 0);
                                    const currentCount = getCategoryCount(cat, addonQty);
                                    if (maxSelection !== null && maxSelection > 0 && currentCount >= maxSelection) return;
                                    setAddonQuantity(addon.id, qty + 1);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
                                >
                                  <FaPlus />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={!available}
                                onClick={() => toggleSelectAddon(cat, addon.id)}
                                className={`h-9 rounded-lg px-3 text-sm font-medium ${qty > 0 ? 'bg-gray-900 text-white hover:bg-black' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                              >
                                {qty > 0 ? 'Selected' : 'Select'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Item notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. no onion, extra spicy"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={props.onClose}
            className="h-11 flex-1 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={trySave}
            className="h-11 flex-1 rounded-xl bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
