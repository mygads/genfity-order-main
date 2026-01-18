'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfluencer } from '../layout';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { InfluencerWithdrawalsSkeleton } from '@/components/common/SkeletonLoaders';
import { fetchInfluencerJson } from '@/lib/utils/influencerAuth';
import {
  FaPlus,
  FaCheckCircle,
  FaWallet,
  FaTimes,
  FaSpinner,
} from 'react-icons/fa';

interface Balance {
  currency: string;
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
}

interface Withdrawal {
  id: string;
  amount: string;
  currency: string;
  status: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  bsb?: string;
  notes?: string;
  processedAt?: string;
  createdAt: string;
}

interface BankDetails {
  bankNameIdr?: string;
  bankAccountNumberIdr?: string;
  bankAccountHolderIdr?: string;
  bankNameAud?: string;
  bankAccountNumberAud?: string;
  bankAccountHolderAud?: string;
  bsbAud?: string;
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

// Get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'REJECTED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

function WithdrawalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCurrency = searchParams.get('currency') || '';
  const { influencer, setIsSidebarOpen } = useInfluencer();
  
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Withdrawal form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    currency: initialCurrency || 'IDR',
    amount: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    const refreshToken = localStorage.getItem('influencerRefreshToken');
    if (!token && !refreshToken) {
      router.push('/influencer/login');
      return;
    }

    try {
      // Fetch dashboard data for balances
      const { response: dashboardRes, data: dashboardData } = await fetchInfluencerJson<{ data: any; message?: string }>('/api/influencer/dashboard');

      if (dashboardRes.status === 401) {
        router.push('/influencer/login');
        return;
      }

      if (dashboardRes.ok && dashboardData?.data) {
        setBankDetails({
          bankNameIdr: dashboardData.data.influencer.bankNameIdr,
          bankAccountNumberIdr: dashboardData.data.influencer.bankAccountNumberIdr,
          bankAccountHolderIdr: dashboardData.data.influencer.bankAccountHolderIdr,
          bankNameAud: dashboardData.data.influencer.bankNameAud,
          bankAccountNumberAud: dashboardData.data.influencer.bankAccountNumberAud,
          bankAccountHolderAud: dashboardData.data.influencer.bankAccountHolderAud,
          bsbAud: dashboardData.data.influencer.bsbAud,
        });
        setBalances(dashboardData.data.balances);
      }

      // Fetch withdrawals
      const { response: withdrawalsRes, data: withdrawalsData } = await fetchInfluencerJson<{ data: Withdrawal[]; message?: string }>('/api/influencer/withdrawals');

      if (withdrawalsRes.status === 401) {
        router.push('/influencer/login');
        return;
      }

      if (withdrawalsRes.ok && withdrawalsData?.data) {
        setWithdrawals(withdrawalsData.data);
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);

    const token = localStorage.getItem('influencerAccessToken');
    const refreshToken = localStorage.getItem('influencerRefreshToken');
    if (!token && !refreshToken) {
      router.push('/influencer/login');
      return;
    }

    // Validation
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid amount');
      setIsSubmitting(false);
      return;
    }

    const selectedBalance = balances.find(b => b.currency === formData.currency);
    if (!selectedBalance || amount > parseFloat(selectedBalance.balance)) {
      setSubmitError('Insufficient balance');
      setIsSubmitting(false);
      return;
    }

    // Check bank details
    if (formData.currency === 'IDR') {
      if (!bankDetails?.bankNameIdr || !bankDetails?.bankAccountNumberIdr) {
        setSubmitError('Please set up your IDR bank details in Settings first');
        setIsSubmitting(false);
        return;
      }
    } else if (formData.currency === 'AUD') {
      if (!bankDetails?.bankNameAud || !bankDetails?.bankAccountNumberAud) {
        setSubmitError('Please set up your AUD bank details in Settings first');
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const { response, data } = await fetchInfluencerJson<{ message?: string }>(
        '/api/influencer/withdrawals',
        {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: formData.currency,
          notes: formData.notes || undefined,
        }),
        }
      );

      if (response.status === 401) {
        router.push('/influencer/login');
        return;
      }

      if (!response.ok) {
        setSubmitError(data?.message || 'Failed to submit withdrawal request');
        setIsSubmitting(false);
        return;
      }

      setSubmitSuccess(true);
      setShowForm(false);
      setFormData({ currency: 'IDR', amount: '', notes: '' });
      
      // Refresh data
      fetchData();
      
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <InfluencerHeader title="Withdrawals" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <InfluencerWithdrawalsSkeleton />
        </main>
      </>
    );
  }

  if (error) {
    return (
      <>
        <InfluencerHeader title="Withdrawals" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-100">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={fetchData} className="px-4 py-2 bg-brand-500 text-white rounded-lg">
                Retry
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  const selectedBalance = balances.find(b => b.currency === formData.currency);

  return (
    <>
      <InfluencerHeader
        title="Withdrawals"
        onMenuClick={() => setIsSidebarOpen(true)}
        rightContent={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium"
          >
            <FaPlus className="w-4 h-4" />
            Request Withdrawal
          </button>
        }
      />

      <main className="p-4 lg:p-6">
        {/* Success Message */}
        {submitSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 flex items-center gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">Withdrawal request submitted successfully!</p>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {balances.map((balance) => (
            <div key={balance.currency} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">
                  {balance.currency === 'IDR' ? '🇮🇩' : balance.currency === 'AUD' ? '🇦🇺' : '💵'}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">{balance.currency} Balance</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(balance.balance, balance.currency)}
              </p>
            </div>
          ))}
        </div>

        {/* Withdrawal History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Withdrawal History</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaWallet className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No withdrawal requests yet</p>
              </div>
            ) : (
              withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount, withdrawal.currency)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {withdrawal.bankName} • {withdrawal.bankAccountNumber}
                      </p>
                      {withdrawal.notes && (
                        <p className="text-sm text-gray-400 mt-1">{withdrawal.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(withdrawal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Withdrawal Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Withdrawal</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setSubmitError('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FaTimes className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {submitError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                </div>
              )}

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {balances.map((b) => (
                    <option key={b.currency} value={b.currency}>
                      {b.currency === 'IDR' ? '🇮🇩' : '🇦🇺'} {b.currency} - Available: {formatCurrency(b.balance, b.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {formData.currency === 'IDR' ? 'Rp' : '$'}
                  </span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step={formData.currency === 'IDR' ? '1000' : '0.01'}
                    className="w-full px-4 py-2.5 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                {selectedBalance && (
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {formatCurrency(selectedBalance.balance, selectedBalance.currency)}
                  </p>
                )}
              </div>

              {/* Bank Details Preview */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Withdrawal will be sent to:</p>
                {formData.currency === 'IDR' ? (
                  bankDetails?.bankNameIdr ? (
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">{bankDetails.bankNameIdr}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{bankDetails.bankAccountNumberIdr}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{bankDetails.bankAccountHolderIdr}</p>
                    </div>
                  ) : (
                    <Link href="/influencer/settings" className="text-brand-500 text-sm font-medium">
                      Set up bank details →
                    </Link>
                  )
                ) : (
                  bankDetails?.bankNameAud ? (
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white">{bankDetails.bankNameAud}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{bankDetails.bankAccountNumberAud}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{bankDetails.bankAccountHolderAud}</p>
                      {bankDetails.bsbAud && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">BSB: {bankDetails.bsbAud}</p>
                      )}
                    </div>
                  ) : (
                    <Link href="/influencer/settings" className="text-brand-500 text-sm font-medium">
                      Set up bank details →
                    </Link>
                  )
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin h-5 w-5" />
                    Processing...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function InfluencerWithdrawalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    }>
      <WithdrawalsContent />
    </Suspense>
  );
}
