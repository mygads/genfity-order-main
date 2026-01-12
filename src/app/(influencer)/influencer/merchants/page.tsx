'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { useInfluencer } from '../layout';
import {
  FaSearch,
  FaDownload,
  FaSortAmountDown,
  FaSortAmountUp,
  FaStore,
  FaSyncAlt,
} from 'react-icons/fa';

interface ReferredMerchant {
  id: string;
  businessName: string;
  merchantCode: string;
  email?: string;
  country: string;
  currency: string;
  isOpen: boolean;
  isActive: boolean;
  createdAt: string;
  subscriptionType: string;
  subscriptionStatus: string;
  totalPayments: number;
  lastPaymentAt?: string | null;
  hasGivenFirstCommission: boolean;
}

interface ApiResponse {
  success: boolean;
  data: {
    merchants: ReferredMerchant[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-AU', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}

function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null | undefined>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function InfluencerMerchantsPage() {
  const router = useRouter();
  const { setIsSidebarOpen } = useInfluencer();

  const [merchants, setMerchants] = useState<ReferredMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState('');
  const [currency, setCurrency] = useState<'all' | 'IDR' | 'AUD'>('all');
  const [openFilter, setOpenFilter] = useState<'all' | 'open' | 'closed'>('all');

  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'code' | 'isOpen' | 'currency'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (q.trim()) params.set('q', q.trim());
    if (currency !== 'all') params.set('currency', currency);
    if (openFilter === 'open') params.set('isOpen', 'true');
    if (openFilter === 'closed') params.set('isOpen', 'false');
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    return params;
  }, [page, limit, q, currency, openFilter, sortBy, sortDir]);

  const fetchMerchants = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/influencer/merchants?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('influencerAccessToken');
        localStorage.removeItem('influencerRefreshToken');
        localStorage.removeItem('influencerData');
        router.push('/influencer/login');
        return;
      }

      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError((result as any).message || 'Failed to load merchants');
        return;
      }

      setMerchants(result.data.merchants || []);
      setTotalPages(result.data.pagination?.totalPages || 1);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [router, queryParams]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  const toggleSortDir = () => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));

  const handleExport = () => {
    downloadCsv('referred-merchants.csv', merchants.map((m) => ({
      businessName: m.businessName,
      merchantCode: m.merchantCode,
      email: m.email || '',
      country: m.country,
      currency: m.currency,
      isOpen: m.isOpen,
      isActive: m.isActive,
      subscriptionType: m.subscriptionType,
      subscriptionStatus: m.subscriptionStatus,
      totalPayments: m.totalPayments,
      lastPaymentAt: m.lastPaymentAt || '',
      createdAt: m.createdAt,
      hasGivenFirstCommission: m.hasGivenFirstCommission,
    })));
  };

  return (
    <>
      <InfluencerHeader title="Referred Merchants" onMenuClick={() => setIsSidebarOpen(true)} />

      <main className="p-4 lg:p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Merchants</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Filter, sort, and export your referral merchants</p>
          </div>

          <button
            onClick={handleExport}
            disabled={merchants.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaDownload className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[240px]">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Name, code, or email"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => {
                  setPage(1);
                  setCurrency(e.target.value as any);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="IDR">🇮🇩 IDR</option>
                <option value="AUD">🇦🇺 AUD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Open Status</label>
              <select
                value={openFilter}
                onChange={(e) => {
                  setPage(1);
                  setOpenFilter(e.target.value as any);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Sort</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setPage(1);
                    setSortBy(e.target.value as any);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="createdAt">Created</option>
                  <option value="name">Name</option>
                  <option value="code">Code</option>
                  <option value="isOpen">Open</option>
                  <option value="currency">Currency</option>
                </select>
                <button
                  onClick={toggleSortDir}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  title="Toggle sort direction"
                >
                  {sortDir === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
                </button>
                <button
                  onClick={() => fetchMerchants()}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  title="Refresh"
                >
                  <FaSyncAlt />
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchMerchants} className="px-4 py-2 bg-orange-500 text-white rounded-lg">
              Retry
            </button>
          </div>
        )}

        {!error && isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <p className="text-gray-600 dark:text-gray-400">Loading merchants…</p>
          </div>
        )}

        {!error && !isLoading && merchants.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-10 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaStore className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No merchants found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting filters or share your referral link</p>
            <div className="mt-4">
              <Link href="/influencer/dashboard" className="text-sm text-orange-500 hover:text-orange-600 font-medium">
                Back to Dashboard →
              </Link>
            </div>
          </div>
        )}

        {!error && !isLoading && merchants.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Merchant</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Subscription</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Total Payments</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {merchants.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-5 py-4">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{m.businessName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{m.merchantCode} · {m.country} · {m.currency}</p>
                          {m.email && <p className="text-xs text-gray-400 truncate">{m.email}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex w-fit items-center px-2 py-1 rounded-full text-xs font-medium ${
                            m.isOpen
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {m.isOpen ? 'Open' : 'Closed'}
                          </span>
                          <span className={`inline-flex w-fit items-center px-2 py-1 rounded-full text-xs font-medium ${
                            m.isActive
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {m.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.subscriptionType}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.subscriptionStatus}</p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(m.totalPayments || 0, m.currency)}
                        </p>
                        {m.lastPaymentAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Last: {new Date(m.lastPaymentAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(m.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.hasGivenFirstCommission ? 'First commission: yes' : 'First commission: no'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
