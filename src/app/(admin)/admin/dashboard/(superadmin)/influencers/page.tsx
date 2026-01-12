'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Balance {
  currency: string;
  balance: string;
  totalEarned: string;
  totalWithdrawn: string;
}

interface Influencer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  country: string;
  defaultCurrency: string;
  isActive: boolean;
  isApproved: boolean;
  approvedAt?: string;
  createdAt: string;
  balances: Balance[];
  pendingWithdrawals: number;
  approvalLogs?: Array<{
    id: string;
    action: 'APPROVE' | 'REJECT';
    reason?: string | null;
    createdAt: string;
    actedByUser: { id: string; name: string; email: string };
  }>;
  _count: {
    referredMerchants: number;
    transactions: number;
    withdrawals: number;
  };
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

export default function SuperAdminInfluencersPage() {
  const router = useRouter();
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [selectedInfluencer, setSelectedInfluencer] = useState<Influencer | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectInfluencer, setRejectInfluencer] = useState<Influencer | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchInfluencers = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch(`/api/superadmin/influencers?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        router.push('/admin/login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setInfluencers(data.data.influencers);
      } else {
        setError(data.message || 'Failed to fetch influencers');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }, [router, filter]);

  useEffect(() => {
    fetchInfluencers();
  }, [fetchInfluencers]);

  const handleApprove = async (influencerId: string) => {
    setActionLoading(influencerId);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`/api/superadmin/influencers/${influencerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: true }),
      });

      if (response.ok) {
        fetchInfluencers();
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectInfluencer) return;

    const reason = rejectReason.trim();
    if (reason.length < 3) return;

    setActionLoading(rejectInfluencer.id);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`/api/superadmin/influencers/${rejectInfluencer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved: false, rejectionReason: reason }),
      });

      if (response.ok) {
        setRejectInfluencer(null);
        setRejectReason('');
        fetchInfluencers();
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (influencerId: string, currentActive: boolean) => {
    setActionLoading(influencerId);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`/api/superadmin/influencers/${influencerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (response.ok) {
        fetchInfluencers();
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Influencer Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage influencer partners and their withdrawals
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Influencers</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{influencers.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {influencers.filter(i => !i.isApproved).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Partners</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {influencers.filter(i => i.isApproved && i.isActive).length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Withdrawals</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {influencers.reduce((sum, i) => sum + i.pendingWithdrawals, 0)}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending Approval' : 'Approved'}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Influencers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Influencer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Referral Code
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Referrals
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Balance
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Status
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {influencers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                    No influencers found
                  </td>
                </tr>
              ) : (
                influencers.map((influencer) => (
                  <tr key={influencer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{influencer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{influencer.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{influencer.country}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                        {influencer.referralCode}
                      </code>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-gray-900 dark:text-white font-medium">{influencer._count.referredMerchants}</p>
                      <p className="text-xs text-gray-500">merchants</p>
                    </td>
                    <td className="px-5 py-4">
                      {influencer.balances.length > 0 ? (
                        <div className="space-y-1">
                          {influencer.balances.map((balance) => (
                            <p key={balance.currency} className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatCurrency(balance.balance, balance.currency)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No balance</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        {influencer.isApproved ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pending
                          </span>
                        )}
                        {!influencer.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Inactive
                          </span>
                        )}
                        {influencer.pendingWithdrawals > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {influencer.pendingWithdrawals} withdrawal(s)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!influencer.isApproved && (
                          <button
                            onClick={() => handleApprove(influencer.id)}
                            disabled={actionLoading === influencer.id}
                            className="px-3 py-1.5 text-sm font-medium bg-green-500 hover:bg-green-600 text-white rounded-lg disabled:opacity-50"
                          >
                            {actionLoading === influencer.id ? '...' : 'Approve'}
                          </button>
                        )}
                        {!influencer.isApproved && (
                          <button
                            onClick={() => {
                              setRejectInfluencer(influencer);
                              setRejectReason('');
                            }}
                            disabled={actionLoading === influencer.id}
                            className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(influencer.id, influencer.isActive)}
                          disabled={actionLoading === influencer.id}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 ${
                            influencer.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {influencer.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link
                          href={`/admin/dashboard/influencers/${influencer.id}`}
                          className="px-3 py-1.5 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg"
                        >
                          Audit
                        </Link>
                        <button
                          onClick={() => setSelectedInfluencer(influencer)}
                          className="px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                        >
                          Details
                        </button>
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
      {selectedInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Influencer Details</h3>
              <button
                onClick={() => setSelectedInfluencer(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-2xl font-bold">
                  {selectedInfluencer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedInfluencer.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{selectedInfluencer.email}</p>
                  <p className="text-sm text-gray-400">{selectedInfluencer.phone || 'No phone'}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referral Code</p>
                  <code className="font-mono font-semibold text-gray-900 dark:text-white">{selectedInfluencer.referralCode}</code>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Country</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedInfluencer.country}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Referrals</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedInfluencer._count.referredMerchants}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Joined</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedInfluencer.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Balances */}
              {selectedInfluencer.balances.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Balances</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedInfluencer.balances.map((balance) => (
                      <div key={balance.currency} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{balance.currency === 'IDR' ? '🇮🇩' : '🇦🇺'}</span>
                          <span className="font-medium">{balance.currency}</span>
                        </div>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(balance.balance, balance.currency)}
                        </p>
                        <div className="mt-2 text-sm text-gray-500">
                          <p>Earned: {formatCurrency(balance.totalEarned, balance.currency)}</p>
                          <p>Withdrawn: {formatCurrency(balance.totalWithdrawn, balance.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Influencer</h3>
              <button
                onClick={() => {
                  setRejectInfluencer(null);
                  setRejectReason('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-xl">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  Rejecting will keep the influencer unapproved. A reason is required and will be recorded in the audit trail.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="e.g., Missing required documents / invalid details"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 3 characters</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setRejectInfluencer(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectReason.trim().length < 3 || actionLoading === rejectInfluencer.id}
                  className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  {actionLoading === rejectInfluencer.id ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
