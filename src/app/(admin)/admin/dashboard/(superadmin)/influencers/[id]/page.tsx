'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Balance {
  currency: string;
  amount: number;
  pendingAmount: number;
}

interface ApprovalLog {
  id: string;
  action: 'APPROVE' | 'REJECT';
  reason?: string | null;
  createdAt: string;
  actedByUser: { id: string; name: string; email: string };
}

interface MerchantSummary {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
  isOpen: boolean;
  hasGivenFirstCommission: boolean;
  createdAt: string;
}

interface InfluencerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  referralCode: string;
  isActive: boolean;
  isApproved: boolean;
  approvedAt?: string | null;
  createdAt: string;
  balances: Balance[];
  approvalLogs: ApprovalLog[];
  referredMerchants: MerchantSummary[];
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function SuperAdminInfluencerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [influencer, setInfluencer] = useState<InfluencerDetail | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const influencerId = params?.id;

  const balancesByCurrency = useMemo(() => {
    const entries = influencer?.balances ?? [];
    return [...entries].sort((a, b) => a.currency.localeCompare(b.currency));
  }, [influencer?.balances]);

  const fetchInfluencer = useCallback(async () => {
    if (!influencerId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/superadmin/influencers/${influencerId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        setError('Failed to load influencer');
        setInfluencer(null);
        return;
      }

      const result = await response.json();
      setInfluencer(result.data as InfluencerDetail);
    } catch {
      setError('Failed to load influencer');
      setInfluencer(null);
    } finally {
      setLoading(false);
    }
  }, [influencerId, router]);

  useEffect(() => {
    fetchInfluencer();
  }, [fetchInfluencer]);

  const updateInfluencer = useCallback(
    async (payload: { isApproved?: boolean; isActive?: boolean; rejectionReason?: string }) => {
      if (!influencerId) return;

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      setSaving(true);
      setError(null);

      try {
        const response = await fetch(`/api/superadmin/influencers/${influencerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          setError(result?.message || 'Failed to update influencer');
          return;
        }

        const result = await response.json();
        setInfluencer(result.data as InfluencerDetail);
      } catch {
        setError('Failed to update influencer');
      } finally {
        setSaving(false);
      }
    },
    [influencerId, router]
  );

  const handleApprove = async () => {
    await updateInfluencer({ isApproved: true });
  };

  const handleToggleActive = async () => {
    if (!influencer) return;
    await updateInfluencer({ isActive: !influencer.isActive });
  };

  const handleReject = async () => {
    const reason = rejectReason.trim();
    if (reason.length < 3) return;

    await updateInfluencer({ isApproved: false, rejectionReason: reason });
    setRejectReason('');
    setRejectOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Influencer Audit</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Approval history, balances, and referred merchants</p>
        </div>

        <div className="flex items-center gap-2">
          {influencer && !influencer.isApproved && (
            <>
              <button
                onClick={handleApprove}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  setRejectOpen(true);
                  setRejectReason('');
                }}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          )}
          {influencer && (
            <button
              onClick={handleToggleActive}
              disabled={saving}
              className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
                influencer.isActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
              }`}
            >
              {influencer.isActive ? 'Deactivate' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      ) : !influencer ? (
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Influencer not found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{influencer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{influencer.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{influencer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Country</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{influencer.country}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Referral Code</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{influencer.referralCode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDateTime(influencer.createdAt)}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Approved</span>
                  <span
                    className={`text-sm font-medium ${
                      influencer.isApproved ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
                    }`}
                  >
                    {influencer.isApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                  <span
                    className={`text-sm font-medium ${
                      influencer.isActive ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {influencer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Approved At</p>
                  <p className="text-sm text-gray-900 dark:text-white font-medium">{formatDateTime(influencer.approvedAt)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Balances</h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {balancesByCurrency.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No balances</p>
              ) : (
                balancesByCurrency.map((b) => (
                  <div key={b.currency} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.currency}</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{Number(b.amount).toFixed(2)}</p>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{Number(b.pendingAmount).toFixed(2)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Approval Audit Trail</h2>
              {influencer.approvalLogs.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No approval actions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {influencer.approvalLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            log.action === 'APPROVE'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }`}
                        >
                          {log.action}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        <p>
                          By <span className="font-medium text-gray-900 dark:text-white">{log.actedByUser?.name || 'Admin'}</span> (
                          {log.actedByUser?.email})
                        </p>
                        {log.reason ? <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Reason: {log.reason}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Referred Merchants</h2>
              {influencer.referredMerchants.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No referred merchants.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <th className="py-2 pr-4">Merchant</th>
                        <th className="py-2 pr-4">Code</th>
                        <th className="py-2 pr-4">Currency</th>
                        <th className="py-2 pr-4">Open</th>
                        <th className="py-2 pr-4">First Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {influencer.referredMerchants.slice(0, 20).map((m) => (
                        <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700/50">
                          <td className="py-3 pr-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{m.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{m.country}</p>
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{m.code}</td>
                          <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">{m.currency}</td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                m.isOpen
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {m.isOpen ? 'Open' : 'Closed'}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${
                                m.hasGivenFirstCommission
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {m.hasGivenFirstCommission ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {influencer.referredMerchants.length > 20 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                      Showing first 20 of {influencer.referredMerchants.length} merchants.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reject Modal */}
      {rejectOpen && influencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Influencer</h3>
              <button
                onClick={() => {
                  setRejectOpen(false);
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
                  Rejection reason is required and will be recorded in the audit trail.
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
                    setRejectOpen(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejectReason.trim().length < 3 || saving}
                  className="px-4 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
                >
                  {saving ? '...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
