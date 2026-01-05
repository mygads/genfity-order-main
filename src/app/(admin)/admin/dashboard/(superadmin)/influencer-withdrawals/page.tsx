'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Influencer {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  country: string;
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
  influencer: Influencer;
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

export default function SuperAdminInfluencerWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('PENDING');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/influencer-withdrawals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setWithdrawals(data.data.withdrawals);
      } else {
        setError(data.message || 'Failed to fetch withdrawals');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [router, filter]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleProcess = async (withdrawalId: string, status: 'PROCESSING' | 'COMPLETED' | 'REJECTED') => {
    setActionLoading(withdrawalId);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`/api/superadmin/influencer-withdrawals/${withdrawalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, adminNotes }),
      });

      if (response.ok) {
        setSelectedWithdrawal(null);
        setAdminNotes('');
        fetchWithdrawals();
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Influencer Withdrawals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Process withdrawal requests from influencer partners
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {(['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'] as const).map((status) => {
          const count = withdrawals.filter(w => w.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`bg-white dark:bg-gray-800 rounded-xl p-5 border text-left transition-all ${
                filter === status 
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status}
              </span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Withdrawals Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Influencer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Bank Details
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Date
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    No withdrawals found
                  </td>
                </tr>
              ) : (
                withdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{withdrawal.influencer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{withdrawal.influencer.email}</p>
                        <code className="text-xs text-gray-400">{withdrawal.influencer.referralCode}</code>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount, withdrawal.currency)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900 dark:text-white">{withdrawal.bankName}</p>
                        <p className="text-gray-500 dark:text-gray-400">{withdrawal.bankAccountNumber}</p>
                        <p className="text-gray-400 text-xs">{withdrawal.bankAccountHolder}</p>
                        {withdrawal.bsb && <p className="text-gray-400 text-xs">BSB: {withdrawal.bsb}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(withdrawal.createdAt).toLocaleDateString()}
                      <br />
                      <span className="text-xs">{new Date(withdrawal.createdAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedWithdrawal(withdrawal);
                            setAdminNotes('');
                          }}
                          className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                        >
                          View
                        </button>
                        {withdrawal.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleProcess(withdrawal.id, 'PROCESSING')}
                              disabled={actionLoading === withdrawal.id}
                              className="px-3 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50"
                            >
                              Process
                            </button>
                          </>
                        )}
                        {withdrawal.status === 'PROCESSING' && (
                          <button
                            onClick={() => handleProcess(withdrawal.id, 'COMPLETED')}
                            disabled={actionLoading === withdrawal.id}
                            className="px-3 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Withdrawal Details</h3>
              <button
                onClick={() => setSelectedWithdrawal(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Amount */}
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency)}
                </p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusColor(selectedWithdrawal.status)}`}>
                  {selectedWithdrawal.status}
                </span>
              </div>

              {/* Influencer Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Influencer</h4>
                <p className="font-medium text-gray-900 dark:text-white">{selectedWithdrawal.influencer.name}</p>
                <p className="text-sm text-gray-500">{selectedWithdrawal.influencer.email}</p>
                <code className="text-xs text-gray-400">{selectedWithdrawal.influencer.referralCode}</code>
              </div>

              {/* Bank Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Bank Details</h4>
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white">{selectedWithdrawal.bankName}</p>
                  <p className="text-gray-700 dark:text-gray-300">{selectedWithdrawal.bankAccountNumber}</p>
                  <p className="text-gray-500 dark:text-gray-400">{selectedWithdrawal.bankAccountHolder}</p>
                  {selectedWithdrawal.bsb && <p className="text-gray-400">BSB: {selectedWithdrawal.bsb}</p>}
                </div>
              </div>

              {/* Notes */}
              {selectedWithdrawal.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{selectedWithdrawal.notes}</p>
                </div>
              )}

              {/* Admin Notes Input */}
              {(selectedWithdrawal.status === 'PENDING' || selectedWithdrawal.status === 'PROCESSING') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Admin Notes</h4>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    placeholder="Add notes (optional)"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              )}

              {/* Action Buttons */}
              {(selectedWithdrawal.status === 'PENDING' || selectedWithdrawal.status === 'PROCESSING') && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleProcess(selectedWithdrawal.id, 'REJECTED')}
                    disabled={actionLoading === selectedWithdrawal.id}
                    className="flex-1 py-2.5 px-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  {selectedWithdrawal.status === 'PENDING' && (
                    <button
                      onClick={() => handleProcess(selectedWithdrawal.id, 'PROCESSING')}
                      disabled={actionLoading === selectedWithdrawal.id}
                      className="flex-1 py-2.5 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      Start Processing
                    </button>
                  )}
                  {selectedWithdrawal.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleProcess(selectedWithdrawal.id, 'COMPLETED')}
                      disabled={actionLoading === selectedWithdrawal.id}
                      className="flex-1 py-2.5 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
