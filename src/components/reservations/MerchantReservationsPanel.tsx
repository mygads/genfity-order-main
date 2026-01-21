'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaBan,
  FaCheckCircle,
  FaExclamationCircle,
  FaExternalLinkAlt,
  FaSpinner,
  FaTable,
  FaUserFriends,
  FaTimes,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaPhone,
  FaEnvelope,
  FaSearch,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useMerchant } from '@/context/MerchantContext';
import { TableActionButton } from '@/components/common/TableActionButton';

type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED';
type ReservationDisplayStatus = ReservationStatus | 'IN_PROGRESS' | 'COMPLETED';

type StatusFilter = 'ALL' | 'ACTIVE' | ReservationStatus;
type DatePreset = 'ALL' | 'TODAY' | 'TOMORROW' | 'CUSTOM';

type ReservationPreorderItem = {
  quantity?: number | string | null;
};

type ReservationPreorder = {
  items?: ReservationPreorderItem[] | null;
} | null;

type PreorderDetailsResponse = {
  reservation: {
    id: string;
    status: string;
    reservationDate: string;
    reservationTime: string;
    notes: string | null;
    customer: {
      name: string;
      email: string;
      phone: string | null;
    } | null;
    order: {
      id: string;
      status: string;
      orderNumber: string;
    } | null;
  };
  preorder: {
    items: Array<{
      menuId: string;
      menuName: string | null;
      quantity: number;
      notes: string | null;
      unitPrice: number;
      isAvailable: boolean;
      addons: Array<{
        addonItemId: string;
        addonName: string | null;
        quantity: number;
        unitPrice: number;
        isAvailable: boolean;
      }>;
    }>;
  };
};

export type ReservationListItem = {
  id: string;
  status: ReservationStatus;
  displayStatus?: ReservationDisplayStatus;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:MM
  tableNumber?: string | null;
  notes: string | null;
  preorder: ReservationPreorder;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    status: string;
    orderNumber: string;
    placedAt: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
};

function statusPill(displayStatus: ReservationDisplayStatus | undefined): string {
  const s = displayStatus || 'PENDING';
  if (s === 'PENDING') return 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400';
  if (s === 'ACCEPTED') return 'bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400';
  if (s === 'IN_PROGRESS') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
  if (s === 'COMPLETED') return 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function normalizeDisplayStatus(input: ReservationDisplayStatus | string | undefined): ReservationDisplayStatus {
  const raw = String(input || '').toUpperCase();
  if (raw === 'PENDING' || raw === 'ACCEPTED' || raw === 'CANCELLED' || raw === 'IN_PROGRESS' || raw === 'COMPLETED') {
    return raw as ReservationDisplayStatus;
  }
  return 'PENDING';
}

function CenteredModal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  disableBackdropClose?: boolean;
  disableEscapeClose?: boolean;
}) {
  useEffect(() => {
    if (!props.open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (props.disableEscapeClose) return;
      props.onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [props.open, props.onClose, props.disableEscapeClose]);

  if (!props.open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-200 bg-black/40"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (props.disableBackdropClose) return;
          props.onClose();
        }}
      />
      <div className="fixed inset-0 z-201 flex items-center justify-center p-4">
        <div
          className="w-full max-w-130 rounded-2xl bg-white shadow-xl border border-gray-200 dark:bg-gray-900 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{props.title}</h3>
            <button
              type="button"
              onClick={props.onClose}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              aria-label="Close"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4">{props.children}</div>
        </div>
      </div>
    </>
  );
}

export default function MerchantReservationsPanel(props: {
  embedded?: boolean;
  initialStatusFilter?: StatusFilter;
  limit?: number;
  pollMs?: number;
  onOrderCreated?: (orderId: string) => void;
  onPendingCountChange?: (pendingCount: number) => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const { merchant } = useMerchant();
  const isTableNumberEnabled = merchant?.requireTableNumberForDineIn === true;

  const {
    embedded: embeddedProp,
    initialStatusFilter,
    limit: limitProp,
    pollMs: pollMsProp,
    onOrderCreated,
    onPendingCountChange,
  } = props;

  const embedded = embeddedProp === true;
  const limit = limitProp ?? 100;
  const pollMs = pollMsProp ?? 15_000;

  const [reservations, setReservations] = useState<ReservationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const [filterQuery, setFilterQuery] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>(initialStatusFilter ?? 'ALL');
  useEffect(() => {
    if (!initialStatusFilter) return;
    setFilterStatus(initialStatusFilter);
  }, [initialStatusFilter]);

  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [filterTimeFrom, setFilterTimeFrom] = useState('');
  const [filterTimeTo, setFilterTimeTo] = useState('');

  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [activeReservationId, setActiveReservationId] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState('');

  const [preorderModalOpen, setPreorderModalOpen] = useState(false);
  const [preorderReservationId, setPreorderReservationId] = useState<string | null>(null);
  const [preorderLoading, setPreorderLoading] = useState(false);
  const [preorderError, setPreorderError] = useState('');
  const [preorderDetails, setPreorderDetails] = useState<PreorderDetailsResponse | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const token = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  }, []);

  const fetchPendingCount = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch('/api/merchant/reservations/count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as ApiResponse<{ pending: number }>;
      const pending = Number(json.data?.pending ?? 0);
      onPendingCountChange?.(Number.isFinite(pending) ? pending : 0);
    } catch {
      // Don't surface count errors as UI errors; the list fetch covers that.
    }
  }, [token, onPendingCountChange]);

  const fetchActive = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch(`/api/merchant/reservations?limit=${encodeURIComponent(String(limit))}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json()) as ApiResponse<ReservationListItem[]>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || t('admin.reservations.errorLoad'));
      }

      const data = Array.isArray(json.data) ? json.data : [];
      setReservations(data);
      // Prefer server-backed count for accuracy (list may be limited/filtered).
      fetchPendingCount();
      setError('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('admin.reservations.errorLoad');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, limit, fetchPendingCount, t]);

  useEffect(() => {
    fetchActive();
    fetchPendingCount();
    const timer = window.setInterval(fetchActive, pollMs);
    return () => window.clearInterval(timer);
  }, [fetchActive, fetchPendingCount, pollMs]);

  const todayYmd = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const tomorrowYmd = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const openAcceptModal = (reservationId: string) => {
    setActiveReservationId(reservationId);
    setTableNumber('');
    setActionError((prev) => ({ ...prev, [reservationId]: '' }));
    setAcceptModalOpen(true);
  };

  const openCancelModal = (reservationId: string) => {
    setActiveReservationId(reservationId);
    setActionError((prev) => ({ ...prev, [reservationId]: '' }));
    setCancelModalOpen(true);
  };

  const closeModals = () => {
    setAcceptModalOpen(false);
    setCancelModalOpen(false);
    setActiveReservationId(null);
    setTableNumber('');
  };

  const closePreorderModal = () => {
    setPreorderModalOpen(false);
    setPreorderReservationId(null);
    setPreorderLoading(false);
    setPreorderError('');
    setPreorderDetails(null);
  };

  const openPreorderModal = async (reservationId: string) => {
    if (!token) return;

    setPreorderReservationId(reservationId);
    setPreorderModalOpen(true);
    setPreorderLoading(true);
    setPreorderError('');
    setPreorderDetails(null);

    try {
      const res = await fetch(`/api/merchant/reservations/${encodeURIComponent(reservationId)}/preorder`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json()) as ApiResponse<PreorderDetailsResponse>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || t('admin.reservations.errorLoad'));
      }

      setPreorderDetails(json.data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('admin.reservations.errorLoad');
      setPreorderError(msg);
    } finally {
      setPreorderLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token || !activeReservationId) return;

    const trimmed = tableNumber.trim();
    if (isTableNumberEnabled && !trimmed) {
      setActionError((prev) => ({ ...prev, [activeReservationId]: t('admin.reservations.tableNumberRequired') }));
      return;
    }

    setAcceptingId(activeReservationId);

    try {
      const res = await fetch(`/api/merchant/reservations/${encodeURIComponent(activeReservationId)}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tableNumber: isTableNumberEnabled ? trimmed : null }),
      });

      const json = (await res.json()) as ApiResponse<{
        reservation: unknown;
        order: { id: string; orderNumber: string };
      }>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || t('admin.reservations.errorAccept'));
      }

      await fetchActive();
      await fetchPendingCount();
      closeModals();

      const createdOrderId = json.data?.order?.id;
      if (createdOrderId) {
        onOrderCreated?.(createdOrderId);
        if (!onOrderCreated) {
          router.push(`/admin/dashboard/orders?orderId=${encodeURIComponent(createdOrderId)}`);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('admin.reservations.errorAccept');
      setActionError((prev) => ({ ...prev, [activeReservationId]: msg }));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCancel = async () => {
    if (!token || !activeReservationId) return;

    setCancellingId(activeReservationId);

    try {
      const res = await fetch(`/api/merchant/reservations/${encodeURIComponent(activeReservationId)}/cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || t('admin.reservations.errorCancel'));
      }

      await fetchActive();
      await fetchPendingCount();
      closeModals();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('admin.reservations.errorCancel');
      setActionError((prev) => ({ ...prev, [activeReservationId]: msg }));
    } finally {
      setCancellingId(null);
    }
  };

  const title = embedded ? t('admin.orders.reservationsTab') : t('admin.reservations.title');

  const getStatusLabel = useCallback((s: ReservationDisplayStatus | undefined) => {
    const normalized = normalizeDisplayStatus(s);
    switch (normalized) {
      case 'PENDING':
        return t('admin.status.pending');
      case 'ACCEPTED':
        return t('admin.status.accepted');
      case 'IN_PROGRESS':
        return t('admin.status.inProgress');
      case 'COMPLETED':
        return t('admin.status.completed');
      case 'CANCELLED':
        return t('admin.status.cancelled');
      default:
        return String(s || '');
    }
  }, [t]);

  const filteredReservations = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    const dateFrom = filterDateFrom || '';
    const dateTo = filterDateTo || '';
    const timeFrom = filterTimeFrom || '';
    const timeTo = filterTimeTo || '';

    return reservations.filter((r) => {
      const displayStatus = normalizeDisplayStatus(r.displayStatus || r.status);

      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'ACTIVE'
            ? displayStatus === 'PENDING' || displayStatus === 'ACCEPTED' || displayStatus === 'IN_PROGRESS'
            : r.status === filterStatus;

      const matchesQuery = !query
        ? true
        : [r.customer?.name, r.customer?.phone, r.customer?.email]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query));

      const d = r.reservationDate || '';
      const matchesFrom = !dateFrom ? true : d >= dateFrom;
      const matchesTo = !dateTo ? true : d <= dateTo;

      // reservationTime is "HH:MM". Lexicographic compare works.
      const tm = r.reservationTime || '';
      const matchesTimeFrom = !timeFrom ? true : tm >= timeFrom;
      const matchesTimeTo = !timeTo ? true : tm <= timeTo;

      return matchesStatus && matchesQuery && matchesFrom && matchesTo && matchesTimeFrom && matchesTimeTo;
    });
  }, [reservations, filterStatus, filterQuery, filterDateFrom, filterDateTo, filterTimeFrom, filterTimeTo]);

  // Pagination logic
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginatedReservations = filteredReservations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={embedded ? '' : 'p-6'}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <button
          type="button"
          onClick={() => fetchActive()}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t('common.refresh')}
        </button>
      </div>

      {/* Search and Filters - Inline Layout (matching menu page) */}
      <div className="mb-5" data-tutorial="reservations-filters">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Bar - Takes remaining space */}
          <div className="relative flex-1 min-w-50" data-tutorial="reservations-search">
            <FaSearch className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={t('admin.reservations.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <option value="ALL">{t('admin.reservations.statusAll')}</option>
            <option value="ACTIVE">{t('admin.reservations.statusActive')}</option>
            <option value="PENDING">{t('admin.reservations.statusPending')}</option>
            <option value="ACCEPTED">{t('admin.reservations.statusAccepted')}</option>
            <option value="CANCELLED">{t('admin.reservations.statusCancelled')}</option>
          </select>

          {/* Quick Filter Buttons */}
          <button
            type="button"
            onClick={() => {
              setDatePreset('TODAY');
              setFilterDateFrom(todayYmd);
              setFilterDateTo(todayYmd);
            }}
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${datePreset === 'TODAY'
              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
              : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
          >
            {t('admin.reservations.chipToday')}
          </button>
          <button
            type="button"
            onClick={() => {
              setDatePreset('TOMORROW');
              setFilterDateFrom(tomorrowYmd);
              setFilterDateTo(tomorrowYmd);
            }}
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${datePreset === 'TOMORROW'
              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
              : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
          >
            {t('admin.reservations.chipTomorrow')}
          </button>

          <button
            type="button"
            onClick={() => {
              setDatePreset('ALL');
              setFilterDateFrom('');
              setFilterDateTo('');
            }}
            className={`h-10 px-4 rounded-lg border text-sm font-medium transition-colors ${datePreset === 'ALL'
              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400'
              : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300'
              }`}
          >
            {t('admin.reservations.chipAllDates')}
          </button>

          {/* Clear All Filters Button */}
          {(filterQuery || filterDateFrom || filterDateTo || filterTimeFrom || filterTimeTo || filterStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setDatePreset('ALL');
                setFilterQuery('');
                setFilterDateFrom('');
                setFilterDateTo('');
                setFilterTimeFrom('');
                setFilterTimeTo('');
                setFilterStatus('ALL');
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FaTimes className="h-3 w-3" />
              {t('admin.reservations.clearFilters')}
            </button>
          )}
        </div>

        {/* Date/Time Range Filters */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setFilterDateFrom(e.target.value);
              }}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => {
                setDatePreset('CUSTOM');
                setFilterDateTo(e.target.value);
              }}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="relative">
            <FaClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="time"
              value={filterTimeFrom}
              onChange={(e) => setFilterTimeFrom(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div className="relative">
            <FaClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="time"
              value={filterTimeTo}
              onChange={(e) => setFilterTimeTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FaSpinner className="animate-spin" />
          {t('admin.reservations.loading')}
        </div>
      )}

      {!loading && error && (
        <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
          <p className="text-sm text-error-700 dark:text-error-400 flex items-center gap-2">
            <FaExclamationCircle />
            {error}
          </p>
        </div>
      )}

      {!loading && !error && filteredReservations.length === 0 && (
        <div className="mt-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <FaUserFriends className="text-gray-500 dark:text-gray-400" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{t('admin.reservations.emptyTitle')}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('admin.reservations.emptyDescription')}</p>
        </div>
      )}

      {/* Table View (matching menu page styling) */}
      {!loading && !error && filteredReservations.length > 0 && (
        <div className="overflow-x-auto" data-tutorial="reservations-list">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tableDate')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tableCustomer')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tablePartySize')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tableTableNumber')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tableStatus')}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.totalItems') || 'Total Items'}
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t('admin.reservations.tableActions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedReservations.map((r, index) => {
                const preorderItems = Array.isArray(r.preorder?.items) ? r.preorder.items : [];
                const preorderCount = preorderItems.reduce(
                  (sum: number, it: ReservationPreorderItem) => sum + (Number(it?.quantity) || 1),
                  0
                );
                const rowError = actionError[r.id];

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                    data-tutorial={index === 0 ? 'reservation-card' : undefined}
                  >
                    {/* Date/Time Column */}
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {r.reservationDate}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {r.reservationTime}
                      </div>
                    </td>

                    {/* Customer Column */}
                    <td className="px-4 py-4">
                      <div className="max-w-50">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                          {r.customer?.name || t('admin.reservations.guest')}
                        </div>
                        {r.customer?.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            <FaPhone className="h-3 w-3" />
                            {r.customer.phone}
                          </div>
                        )}
                        {r.customer?.email && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            <FaEnvelope className="h-3 w-3" />
                            {r.customer.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Party Size Column */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                        <FaUsers className="h-3 w-3 text-gray-400" />
                        {r.partySize}
                      </span>
                    </td>

                    {/* Table Number Column */}
                    <td className="px-4 py-4">
                      {r.tableNumber ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {r.tableNumber}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusPill(r.displayStatus || r.status)}`}>
                        {getStatusLabel(r.displayStatus || r.status)}
                      </span>
                      {r.order && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t('admin.reservations.linkedOrderStatusLabel')}: {r.order.status}
                        </div>
                      )}
                    </td>

                    {/* Total Items Column */}
                    <td className="px-4 py-4">
                      {preorderCount > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {preorderCount} {t('admin.reservations.itemsLabel')}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.status === 'PENDING' ? (
                          <>
                            <TableActionButton
                              icon={FaCheckCircle}
                              title={t('admin.reservations.accept')}
                              aria-label={t('admin.reservations.accept')}
                              onClick={() => openAcceptModal(r.id)}
                              disabled={acceptingId === r.id || cancellingId === r.id}
                              data-tutorial={index === 0 ? 'reservation-accept-btn' : undefined}
                            />
                            <TableActionButton
                              icon={FaBan}
                              tone="danger"
                              containerClassName="border-error-200 dark:border-error-800"
                              title={t('admin.reservations.cancel')}
                              aria-label={t('admin.reservations.cancel')}
                              onClick={() => openCancelModal(r.id)}
                              disabled={acceptingId === r.id || cancellingId === r.id}
                              data-tutorial={index === 0 ? 'reservation-cancel-btn' : undefined}
                            />
                            <TableActionButton
                              icon={FaExternalLinkAlt}
                              label={t('common.view')}
                              title={t('admin.reservations.viewOrder')}
                              aria-label={t('admin.reservations.viewOrder')}
                              onClick={() => {
                                if (!r.order?.id) {
                                  openPreorderModal(r.id);
                                  return;
                                }

                                const displayStatus = normalizeDisplayStatus(r.displayStatus || r.status);
                                const target =
                                  displayStatus === 'COMPLETED'
                                    ? `/admin/dashboard/orders/history?orderId=${encodeURIComponent(r.order.id)}`
                                    : `/admin/dashboard/orders?orderId=${encodeURIComponent(r.order.id)}`;
                                router.push(target);
                              }}
                              data-tutorial={index === 0 ? 'reservation-view-btn' : undefined}
                            />
                          </>
                        ) : (
                          <>
                            <TableActionButton
                              icon={FaExternalLinkAlt}
                              label={t('common.view')}
                              title={t('admin.reservations.viewOrder')}
                              aria-label={t('admin.reservations.viewOrder')}
                              onClick={() => {
                                if (!r.order?.id) {
                                  openPreorderModal(r.id);
                                  return;
                                }

                                const displayStatus = normalizeDisplayStatus(r.displayStatus || r.status);
                                const target =
                                  displayStatus === 'COMPLETED'
                                    ? `/admin/dashboard/orders/history?orderId=${encodeURIComponent(r.order.id)}`
                                    : `/admin/dashboard/orders?orderId=${encodeURIComponent(r.order.id)}`;
                                router.push(target);
                              }}
                              data-tutorial={index === 0 ? 'reservation-view-btn' : undefined}
                            />
                          </>
                        )}
                      </div>
                      {rowError && (
                        <div className="mt-2 p-2 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
                          <p className="text-xs text-error-700 dark:text-error-400 flex items-center gap-1">
                            <FaExclamationCircle />
                            {rowError}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('admin.reservations.paginationShowing', {
              from: (currentPage - 1) * itemsPerPage + 1,
              to: Math.min(currentPage * itemsPerPage, filteredReservations.length),
              total: filteredReservations.length,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FaChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.reservations.paginationPage', { page: currentPage, totalPages })}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FaChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <CenteredModal
        open={preorderModalOpen}
        title={t('admin.reservations.preorderModalTitle')}
        onClose={() => {
          if (preorderLoading) return;
          closePreorderModal();
        }}
      >
        <div className="space-y-4">
          {preorderLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <FaSpinner className="animate-spin" />
              {t('admin.reservations.preorderModalLoading')}
            </div>
          ) : preorderError ? (
            <div className="p-3 bg-error-50 border border-error-200 rounded-lg dark:bg-error-900/20 dark:border-error-800">
              <p className="text-sm text-error-700 dark:text-error-400 flex items-center gap-2">
                <FaExclamationCircle />
                {preorderError}
              </p>
            </div>
          ) : preorderDetails?.preorder?.items?.length ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {preorderDetails.reservation.customer?.name || t('admin.reservations.guest')}
                </div>
                <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  {preorderDetails.reservation.reservationDate} • {preorderDetails.reservation.reservationTime}
                </div>
                {preorderDetails.reservation.notes ? (
                  <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('admin.reservations.notesLabel')}:</span> {preorderDetails.reservation.notes}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                {preorderDetails.preorder.items.map((it, idx) => (
                  <div
                    key={`${it.menuId}_${idx}`}
                    className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {it.menuName || t('admin.reservations.notAvailable')}
                        </div>
                        {!it.isAvailable ? (
                          <div className="mt-0.5 text-xs text-error-700 dark:text-error-300">
                            {t('admin.reservations.notAvailable')}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                        ×{it.quantity}
                      </div>
                    </div>

                    {it.notes ? (
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{t('admin.reservations.notesLabel')}:</span> {it.notes}
                      </div>
                    ) : null}

                    {it.addons.length ? (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t('admin.reservations.preorderLabel')}
                        </div>
                        {it.addons.map((a, aIdx) => (
                          <div key={`${a.addonItemId}_${aIdx}`} className="text-sm text-gray-700 dark:text-gray-300">
                            - {a.addonName || t('admin.reservations.notAvailable')}
                            <span className="text-xs text-gray-500 dark:text-gray-400"> ×{a.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('admin.reservations.preorderModalEmpty')}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={closePreorderModal}
              disabled={preorderLoading}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </CenteredModal>

      <CenteredModal
        open={acceptModalOpen}
        title={t('admin.reservations.acceptTitle')}
        onClose={() => {
          if (acceptingId) return;
          closeModals();
        }}
        disableBackdropClose={Boolean(tableNumber.trim())}
        disableEscapeClose={Boolean(tableNumber.trim())}
      >
        <div className="space-y-4">
          {isTableNumberEnabled ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('admin.reservations.tableNumberLabel')}
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <FaTable />
                </div>
                <input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  maxLength={50}
                  className="w-full h-11 pl-10 pr-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 dark:bg-gray-800 dark:text-white"
                  placeholder={t('admin.reservations.tableNumberPlaceholder')}
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeModals}
              disabled={Boolean(acceptingId)}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={Boolean(acceptingId)}
              className="h-10 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptingId ? t('admin.reservations.accepting') : t('admin.reservations.accept')}
            </button>
          </div>
        </div>
      </CenteredModal>

      <CenteredModal
        open={cancelModalOpen}
        title={t('admin.reservations.cancelTitle')}
        onClose={() => {
          if (cancellingId) return;
          closeModals();
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">{t('admin.reservations.cancelConfirm')}</p>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeModals}
              disabled={Boolean(cancellingId)}
              className="h-10 px-4 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.close')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={Boolean(cancellingId)}
              className="h-10 px-4 rounded-lg bg-gray-900 hover:bg-gray-950 text-white text-sm dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancellingId ? t('admin.reservations.cancelling') : t('admin.reservations.cancel')}
            </button>
          </div>
        </div>
      </CenteredModal>
    </div >
  );
}
