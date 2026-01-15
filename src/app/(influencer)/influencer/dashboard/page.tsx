'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useInfluencer } from '../layout';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { InfluencerDashboardSkeleton } from '@/components/common/SkeletonLoaders';
import {
  FaExclamationCircle,
  FaClock,
  FaCheck,
  FaCopy,
  FaUsers,
  FaCheckCircle,
  FaMoneyBillWave,
  FaChartBar,
  FaStore,
  FaClipboardList,
} from 'react-icons/fa';

interface Balance {
  currency: string;
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
}

interface ReferredMerchant {
  id: string;
  businessName: string;
  merchantCode: string;
  country: string;
  currency: string;
  isOpen: boolean;
  createdAt: string;
  hasGivenFirstCommission: boolean;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description?: string;
  createdAt: string;
}

interface DashboardData {
  balances: Balance[];
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    pendingWithdrawals: number;
    pendingWithdrawalAmount: Record<string, string>;
    thisMonthEarnings: Record<string, string>;
    allTimeEarnings: Record<string, string>;
  };
  referredMerchants: ReferredMerchant[];
  recentTransactions: Transaction[];
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
function getTransactionTypeLabel(type: string): { label: string; color: string } {
  switch (type) {
    case 'COMMISSION_FIRST':
      return { label: 'First Commission', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 'COMMISSION_RECURRING':
      return { label: 'Recurring Commission', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'WITHDRAWAL':
      return { label: 'Withdrawal', color: 'bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400' };
    case 'ADJUSTMENT':
      return { label: 'Adjustment', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
    default:
      return { label: type, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  }
}

export default function InfluencerDashboardPage() {
  const { influencer, setIsSidebarOpen } = useInfluencer();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    if (!token) return;

    try {
      const response = await fetch('/api/influencer/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (response.ok) {
        setData({
          balances: result.data.balances,
          stats: result.data.stats,
          referredMerchants: result.data.referredMerchants,
          recentTransactions: result.data.recentTransactions,
        });
      } else {
        setError(result.message || 'Failed to load dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  if (isLoading) {
    return (
      <>
        <InfluencerHeader title="Dashboard" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <InfluencerDashboardSkeleton />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <InfluencerHeader title="Dashboard" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchDashboard}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!data || !influencer) return null;

  const { balances, stats, referredMerchants, recentTransactions } = data;
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/merchant?ref=${influencer.referralCode}`;

  return (
    <>
      <InfluencerHeader
        title="Dashboard"
        onMenuClick={() => setIsSidebarOpen(true)}
        rightContent={
          !influencer.isApproved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
              <FaClock className="w-4 h-4" />
              Pending Approval
            </span>
          )
        }
      />

      <main className="p-4 lg:p-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl p-6 mb-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">Welcome back, {influencer.name}!</h2>
            <p className="text-brand-100 mb-4">Share your referral link and start earning commissions</p>
            
            {/* Referral Code & Link */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-brand-100 mb-1">Your Referral Code</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold">{influencer.referralCode}</code>
                  <button
                    onClick={() => copyToClipboard(influencer.referralCode, 'code')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    title="Copy code"
                  >
                    {copySuccess === 'code' ? (
                      <FaCheck className="w-5 h-5" />
                    ) : (
                      <FaCopy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-xs text-brand-100 mb-1">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate flex-1">{referralLink}</p>
                  <button
                    onClick={() => copyToClipboard(referralLink, 'link')}
                    className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                    title="Copy link"
                  >
                    {copySuccess === 'link' ? (
                      <FaCheck className="w-5 h-5" />
                    ) : (
                      <FaCopy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FaUsers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReferrals}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Referrals</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeReferrals}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Merchants</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                <FaMoneyBillWave className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingWithdrawals}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Withdrawals</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <FaChartBar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="space-y-1">
              {Object.entries(stats.thisMonthEarnings).length > 0 ? (
                Object.entries(stats.thisMonthEarnings).map(([currency, amount]) => (
                  <p key={currency} className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(amount, currency)}
                  </p>
                ))
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-white">$0</p>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
          </div>
        </div>

        {/* Earnings & Pending Withdrawals */}
        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <FaMoneyBillWave className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">All-time Earnings</h3>
              </div>
            </div>
            {Object.keys(stats.allTimeEarnings || {}).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.allTimeEarnings).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{currency}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(amount, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No earnings yet</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-lg flex items-center justify-center">
                  <FaClock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Pending Withdrawal Amount</h3>
              </div>
            </div>
            {Object.keys(stats.pendingWithdrawalAmount || {}).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.pendingWithdrawalAmount).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{currency}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(amount, currency)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending withdrawals</p>
            )}
          </div>
        </div>

        {/* Balance Cards */}
        {balances.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Balances</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {balances.map((balance) => (
                <div
                  key={balance.currency}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {balance.currency === 'IDR' ? '🇮🇩' : balance.currency === 'AUD' ? '🇦🇺' : '💵'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{balance.currency}</span>
                    </div>
                    <Link
                      href={`/influencer/withdrawals?currency=${balance.currency}`}
                      className="text-sm text-brand-500 hover:text-brand-600 font-medium"
                    >
                      Withdraw →
                    </Link>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {formatCurrency(balance.balance, balance.currency)}
                  </p>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Earned</p>
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(balance.totalEarned, balance.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Withdrawn</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatCurrency(balance.totalWithdrawn, balance.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Referred Merchants */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Referred Merchants</h3>
              <span className="text-sm text-gray-500">{referredMerchants.length} total</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {referredMerchants.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaStore className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No referrals yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Share your referral link to start earning</p>
                </div>
              ) : (
                referredMerchants.map((merchant) => (
                  <div key={merchant.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{merchant.businessName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {merchant.merchantCode} · {merchant.country}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          merchant.isOpen 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {merchant.isOpen ? 'Open' : 'Closed'}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(merchant.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
              <Link href="/influencer/transactions" className="text-sm text-brand-500 hover:text-brand-600 font-medium">
                View All →
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FaClipboardList className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Your earnings will appear here</p>
                </div>
              ) : (
                recentTransactions.map((tx) => {
                  const typeInfo = getTransactionTypeLabel(tx.type);
                  const isPositive = tx.type !== 'WITHDRAWAL';
                  return (
                    <div key={tx.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          {tx.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{tx.description}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className={`font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(tx.amount)), tx.currency)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
