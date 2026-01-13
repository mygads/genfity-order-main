'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import RestaurantBanner from '@/components/customer/RestaurantBanner';
import RestaurantInfoCard from '@/components/customer/RestaurantInfoCard';
import { useToast } from '@/hooks/useToast';
import ReservationPreorderItemModal from '@/components/customer/ReservationPreorderItemModal';
import { FaCalendarAlt, FaChevronLeft, FaMinus, FaPlus, FaSpinner } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';

interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  categoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  isActive: boolean;
  trackStock: boolean;
  addonCategories?: Array<{
    id: string;
    name: string;
    description?: string | null;
    minSelection?: number;
    maxSelection?: number | null;
    isRequired?: boolean;
    displayOrder?: number;
    addonItems: Array<{
      id: string;
      name: string;
      description?: string | null;
      price: number;
      inputType?: 'SELECT' | 'QTY' | 'checkbox' | 'quantity' | null;
      displayOrder?: number;
      trackStock?: boolean;
      stockQty?: number | null;
      isActive?: boolean;
    }>;
  }>;
}

interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isActive: boolean;
  currency: string;
  timezone: string;
  isReservationEnabled?: boolean;
  reservationMenuRequired?: boolean;
  reservationMinItemCount?: number;
}

type SelectedItem = {
  menuId: string;
  name: string;
  quantity: number;
  notes?: string;
  addonQty?: Record<string, number>; // addonItemId -> qty
};

function getMenuAddonCategories(menu: MenuItem): NonNullable<MenuItem['addonCategories']> {
  return Array.isArray(menu.addonCategories) ? menu.addonCategories : [];
}

function getAddonCountForMenu(menu: MenuItem, addonQty: Record<string, number>): number {
  const categories = getMenuAddonCategories(menu);
  if (!categories.length) return 0;
  const ids = new Set<string>();
  for (const cat of categories) {
    for (const addon of cat.addonItems || []) {
      if ((addonQty[addon.id] || 0) > 0) ids.add(addon.id);
    }
  }
  return ids.size;
}

function validateAddonsForMenu(menu: MenuItem, addonQty: Record<string, number>): string | null {
  const categories = getMenuAddonCategories(menu);
  for (const cat of categories) {
    const minSelection = Math.max(0, Number(cat.minSelection ?? 0));
    const maxSelection = cat.maxSelection === null ? null : Number(cat.maxSelection ?? 0);
    const treatAsQty = (cat.addonItems || []).some((a) => a.inputType === 'QTY' || a.inputType === 'quantity');

    const count = treatAsQty
      ? (cat.addonItems || []).reduce((sum, a) => sum + (addonQty[a.id] || 0), 0)
      : (cat.addonItems || []).reduce((sum, a) => sum + ((addonQty[a.id] || 0) > 0 ? 1 : 0), 0);

    if (count < minSelection) {
      return `Please select at least ${minSelection} item(s) for ${menu.name} (${cat.name}).`;
    }

    if (maxSelection !== null && maxSelection > 0 && count > maxSelection) {
      return `Please select no more than ${maxSelection} item(s) for ${menu.name} (${cat.name}).`;
    }
  }
  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function getTodayInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getNowTimeInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export default function ReservationClientPage(props: {
  merchantCode: string;
  initialMerchant: MerchantInfo;
  initialCategories: Category[];
  initialMenus: MenuItem[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const { locale } = useTranslation();

  const merchant = props.initialMerchant;
  const tz = merchant.timezone || 'Australia/Sydney';

  const today = useMemo(() => getTodayInTimezone(tz), [tz]);
  const nowTime = useMemo(() => getNowTimeInTimezone(tz), [tz]);

  const isReservationEnabled = merchant.isReservationEnabled === true;
  const reservationMinItemCount = Number(merchant.reservationMinItemCount ?? 0);
  const reservationRequiresPreorder = merchant.reservationMenuRequired === true || reservationMinItemCount > 0;
  const preorderMinItems = merchant.reservationMenuRequired
    ? Math.max(1, reservationMinItemCount || 1)
    : reservationMinItemCount;

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [reservationDate, setReservationDate] = useState(today);
  const [reservationTime, setReservationTime] = useState('');
  const [notes, setNotes] = useState('');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, SelectedItem>>({});
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  const menus = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return props.initialMenus;
    return props.initialMenus.filter((m) => m.name.toLowerCase().includes(q));
  }, [props.initialMenus, search]);

  const selectedItems = useMemo(() => Object.values(selected).filter((x) => x.quantity > 0), [selected]);
  const totalSelectedCount = useMemo(
    () => selectedItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0),
    [selectedItems]
  );

  const selectedMenuForEdit = useMemo(() => {
    if (!editingMenuId) return null;
    return props.initialMenus.find((m) => m.id === editingMenuId) || null;
  }, [editingMenuId, props.initialMenus]);

  const setQty = (menu: MenuItem, nextQty: number) => {
    setSelected((prev) => {
      const qty = Math.max(0, Math.min(99, nextQty));
      const next = { ...prev };
      if (qty <= 0) {
        delete next[menu.id];
        return next;
      }
      const existing = next[menu.id];
      next[menu.id] = {
        menuId: menu.id,
        name: menu.name,
        quantity: qty,
        notes: existing?.notes,
        addonQty: existing?.addonQty,
      };
      return next;
    });
  };

  const validate = () => {
    if (!isReservationEnabled) return 'Reservations are not available for this merchant.';

    if (!customerName.trim()) return 'Name is required.';
    if (!customerEmail.trim() || !isValidEmail(customerEmail)) return 'Valid email is required.';

    const size = Number(partySize);
    if (!Number.isFinite(size) || size <= 0 || size > 100) return 'Party size must be between 1 and 100.';

    if (!reservationDate) return 'Reservation date is required.';
    if (!reservationTime.trim() || !isValidHHMM(reservationTime)) return 'Reservation time must be HH:MM.';

    if (reservationDate === today && reservationTime < nowTime) {
      return 'Reservation time cannot be in the past.';
    }

    if (reservationRequiresPreorder && totalSelectedCount < preorderMinItems) {
      return `Preorder is required (minimum ${preorderMinItems} item(s)).`;
    }

    // Validate addon rules for selected items
    for (const it of selectedItems) {
      const menu = props.initialMenus.find((m) => m.id === it.menuId);
      if (!menu) continue;
      const msg = validateAddonsForMenu(menu, it.addonQty || {});
      if (msg) return msg;
    }

    return null;
  };

  const submit = async () => {
    setApiError('');
    const err = validate();
    if (err) {
      setApiError(err);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantCode: props.merchantCode,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim() || undefined,
          partySize: Number(partySize),
          reservationDate,
          reservationTime: reservationTime.trim(),
          notes: notes.trim() || undefined,
          items: selectedItems.map((it) => ({
            menuId: it.menuId,
            quantity: it.quantity,
            notes: it.notes?.trim() || undefined,
            addons: Object.entries(it.addonQty || {})
              .filter(([, qty]) => Number(qty) > 0)
              .map(([addonItemId, qty]) => ({
                addonItemId,
                quantity: Number(qty) || 1,
              })),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create reservation');
      }

      setSuccessData(json.data);
      showToast({
        variant: 'success',
        title: 'Reservation Requested',
        message: 'Your reservation request has been submitted.',
        duration: 4000,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create reservation';
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div>
        <RestaurantBanner
          bannerUrl={merchant.bannerUrl}
          imageUrl={merchant.logoUrl}
          merchantName={merchant.name}
          isClosed={false}
        />

        <div className="px-3 -mt-6 relative z-10">
          <RestaurantInfoCard
            name={merchant.name}
            openingHours={[]}
            onClick={() => null}
            isClosed={false}
            logoUrl={merchant.logoUrl}
          />
        </div>

        <div className="px-3 mt-4">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <h1 className="text-lg font-semibold text-green-900">Reservation Submitted</h1>
            <p className="mt-1 text-sm text-green-800">
              We received your request for {reservationDate} at {reservationTime}.
            </p>
            <p className="mt-2 text-sm text-green-800">
              The merchant will confirm your reservation. If you preordered items, stock is checked when the merchant accepts.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => router.replace(`/${props.merchantCode}`)}
              className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => router.replace(`/${props.merchantCode}/order`)}
              className="h-11 flex-1 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-black"
            >
              Order Food
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (amount: number): string => formatCurrency(amount, merchant.currency || 'AUD', locale);

  return (
    <div>
      <RestaurantBanner
        bannerUrl={merchant.bannerUrl}
        imageUrl={merchant.logoUrl}
        merchantName={merchant.name}
        isClosed={!isReservationEnabled}
      />

      <div className="px-3 -mt-6 relative z-10">
        <RestaurantInfoCard
          name={merchant.name}
          openingHours={[]}
          onClick={() => router.replace(`/${props.merchantCode}`)}
          isClosed={!isReservationEnabled}
          logoUrl={merchant.logoUrl}
        />
      </div>

      <div className="px-3 mt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.replace(`/${props.merchantCode}`)}
            className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center"
          >
            <FaChevronLeft />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Table Reservation</h1>
            <p className="text-sm text-gray-600">Request a reservation in the merchant timezone ({tz}).</p>
          </div>
        </div>

        {!isReservationEnabled && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">Reservations are disabled for this merchant.</p>
          </div>
        )}

        {apiError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Your details</h2>
            <div className="mt-3 grid gap-3">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Full name"
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
              />
              <input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email"
                inputMode="email"
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
                inputMode="tel"
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">Reservation</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600">Party size</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value || 1))}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Date</label>
                <input
                  type="date"
                  min={today}
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Time</label>
                <input
                  type="time"
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Current time in merchant timezone: {nowTime}</p>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-600">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm"
                  rows={3}
                  placeholder="Anything the merchant should know"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Preorder (optional)</h2>
                <p className="text-xs text-gray-600">
                  {reservationRequiresPreorder
                    ? `Required (minimum ${preorderMinItems} item(s)). Stock is checked when the merchant accepts.`
                    : 'Add menu items to speed up service. Stock is checked when the merchant accepts.'}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                <FaCalendarAlt className="text-gray-400" />
                <span>{totalSelectedCount} item(s)</span>
              </div>
            </div>

            <div className="mt-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search menu"
                className="h-11 w-full rounded-lg border border-gray-200 px-3 text-sm"
              />
            </div>

            <div className="mt-3 grid gap-2">
              {menus.slice(0, 30).map((m) => {
                const qty = selected[m.id]?.quantity || 0;
                const hasAddons = getMenuAddonCategories(m).length > 0;
                const addonSelectedCount = getAddonCountForMenu(m, selected[m.id]?.addonQty || {});
                const hasNotes = Boolean(selected[m.id]?.notes?.trim());
                return (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                      {m.description ? <div className="text-xs text-gray-500 truncate">{m.description}</div> : null}
                      <div className="mt-1 text-xs text-gray-600">
                        {formatPrice(m.price)}
                        {hasAddons ? ` • ${addonSelectedCount} addon(s)` : ''}
                        {hasNotes ? ' • notes added' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 && (
                        <button
                          type="button"
                          onClick={() => setEditingMenuId(m.id)}
                          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800"
                        >
                          {hasAddons || hasNotes ? 'Customize' : 'Add notes/addons'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setQty(m, qty - 1)}
                        className="h-9 w-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center"
                        aria-label={`Decrease ${m.name}`}
                      >
                        <FaMinus className="h-3 w-3" />
                      </button>
                      <div className="w-8 text-center text-sm font-semibold text-gray-900">{qty}</div>
                      <button
                        type="button"
                        onClick={() => setQty(m, qty + 1)}
                        className="h-9 w-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center"
                        aria-label={`Increase ${m.name}`}
                      >
                        <FaPlus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {menus.length > 30 && (
                <div className="text-xs text-gray-500">Showing first 30 items. Use search to find more.</div>
              )}
              {menus.length === 0 && (
                <div className="text-sm text-gray-500">No menu items found.</div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={submitting || !isReservationEnabled}
            className="h-12 w-full rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2 justify-center">
                <FaSpinner className="animate-spin" /> Submitting…
              </span>
            ) : (
              'Submit Reservation Request'
            )}
          </button>
        </div>
      </div>

      <ReservationPreorderItemModal
        isOpen={Boolean(selectedMenuForEdit)}
        menu={
          selectedMenuForEdit
            ? {
                id: selectedMenuForEdit.id,
                name: selectedMenuForEdit.name,
                addonCategories: selectedMenuForEdit.addonCategories as any,
              }
            : ({ id: '', name: '' } as any)
        }
        currency={merchant.currency || 'AUD'}
        initialNotes={selectedMenuForEdit ? (selected[selectedMenuForEdit.id]?.notes || '') : ''}
        initialAddonQty={selectedMenuForEdit ? (selected[selectedMenuForEdit.id]?.addonQty || {}) : {}}
        onClose={() => setEditingMenuId(null)}
        onSave={({ notes: nextNotes, addonQty }) => {
          if (!selectedMenuForEdit) return;
          const msg = validateAddonsForMenu(selectedMenuForEdit, addonQty);
          if (msg) {
            setApiError(msg);
            return;
          }

          setSelected((prev) => {
            const existing = prev[selectedMenuForEdit.id];
            if (!existing) return prev;
            return {
              ...prev,
              [selectedMenuForEdit.id]: {
                ...existing,
                notes: nextNotes,
                addonQty,
              },
            };
          });

          setEditingMenuId(null);
        }}
      />
    </div>
  );
}
