'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInfluencer } from '../layout';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { InfluencerTransactionsSkeleton } from '@/components/common/SkeletonLoaders';
import { fetchInfluencerJson } from '@/lib/utils/influencerAuth';
import {
  FaCheckCircle,
  FaSyncAlt,
  FaMoneyBillWave,
  FaCog,
  FaArrowCircleDown,
  FaClipboardList,
} from 'react-icons/fa';

interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

// Format currency for display
function formatCurrency(amount: number | string, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(num);
}

// Get transaction type label
function getTransactionTypeInfo(type: string): { label: string; color: string; icon: React.ReactNode } {
  switch (type) {
    case 'COMMISSION_FIRST':
      return {
        label: 'First Commission',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        icon: <FaCheckCircle className="w-5 h-5 text-green-500" />,
      };
    case 'COMMISSION_RECURRING':
      return {
        label: 'Recurring Commission',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        icon: <FaSyncAlt className="w-5 h-5 text-blue-500" />,
      };
    case 'WITHDRAWAL':
      return {
        label: 'Withdrawal',
        color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400',
        icon: <FaMoneyBillWave className="w-5 h-5 text-brand-500" />,
      };
    case 'ADJUSTMENT':
      return {
        label: 'Adjustment',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <FaCog className="w-5 h-5 text-gray-500" />,
      };
    default:
      return {
        label: type,
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        icon: <FaArrowCircleDown className="w-5 h-5 text-gray-500" />,
      };
  }
}

export default function InfluencerTransactionsPage() {
  const router = useRouter();
  const { setIsSidebarOpen } = useInfluencer();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');

  const fetchTransactions = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    const refreshToken = localStorage.getItem('influencerRefreshToken');
    if (!token && !refreshToken) {
      router.push('/influencer/login');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('type', filter);
      if (currencyFilter !== 'all') params.append('currency', currencyFilter);

      const { response, data } = await fetchInfluencerJson<{ data: { transactions?: Transaction[] } | Transaction[]; message?: string }>(
        `/api/influencer/transactions?${params}`
      );

      if (response.status === 401) {
        router.push('/influencer/login');
        return;
      }

      if (response.ok) {
        if (Array.isArray(data?.data)) {
          setTransactions(data.data as Transaction[]);
        } else {
          setTransactions(data?.data?.transactions || []);
        }
      } else {
        setError(data?.message || 'Failed to load transactions');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [router, filter, currencyFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, tx) => {
    const date = new Date(tx.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  if (isLoading) {
    return (
      <>
        <InfluencerHeader title="Transactions" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <InfluencerTransactionsSkeleton />
        </main>
      </>
    );
  }

  return (
    <>
      <InfluencerHeader title="Transaction History" onMenuClick={() => setIsSidebarOpen(true)} />

      <main className="p-4 lg:p-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Type</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="COMMISSION_FIRST">First Commission</option>
                <option value="COMMISSION_RECURRING">Recurring Commission</option>
                <option value="WITHDRAWAL">Withdrawal</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Currency</label>
              <select
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Currencies</option>
                <option value="IDR">🇮🇩 IDR</option>
                <option value="AUD">🇦🇺 AUD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={fetchTransactions} className="px-4 py-2 bg-brand-500 text-white rounded-lg">
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && transactions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaClipboardList className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No transactions yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Your earnings and withdrawals will appear here</p>
          </div>
        )}

        {/* Transaction List */}
        {!error && transactions.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, txs]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{date}</h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                  {txs.map((tx) => {
                    const typeInfo = getTransactionTypeInfo(tx.type);
                    const isPositive = tx.type !== 'WITHDRAWAL';
                    const amount = parseFloat(tx.amount);
                    
                    return (
                      <div key={tx.id} className="p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          {typeInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {tx.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{tx.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(amount), tx.currency)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
