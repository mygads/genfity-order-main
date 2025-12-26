"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { useSWRConfig } from "swr";

interface PaymentRequest {
    id: string;
    merchantId: string;
    merchantCode: string;
    merchantName: string;
    type: 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION';
    status: string;
    currency: string;
    amount: number;
    monthsRequested: number | null;
    transferNotes: string | null;
    transferProofUrl: string | null;
    confirmedAt: string | null;
    createdAt: string;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

/**
 * Payment Verification Page (Super Admin)
 * 
 * Lists confirmed payments awaiting admin verification
 */
export default function PaymentVerificationPage() {
    const { success: showSuccess, error: showError } = useToast();
    const { mutate } = useSWRConfig();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

    const {
        data: response,
        isLoading,
        error: _error
    } = useSWRStatic<ApiResponse<{ requests: PaymentRequest[] }>>('/api/admin/payment-requests');

    const requests = response?.data?.requests || [];

    const formatCurrency = (amount: number, currency: string) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTypeLabel = (type: string) => {
        return type === 'DEPOSIT_TOPUP' ? 'Top Up Deposit' : 'Langganan Bulanan';
    };

    const handleVerify = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/payment-requests/${id}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Verified by admin' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to verify');
            }

            showSuccess('Berhasil', 'Pembayaran berhasil diverifikasi!');
            mutate('/api/admin/payment-requests');
        } catch (err: unknown) {
            showError('Gagal', err instanceof Error ? err.message : 'Gagal memverifikasi');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            showError('Error', 'Alasan penolakan wajib diisi');
            return;
        }

        setProcessingId(id);
        try {
            const res = await fetch(`/api/admin/payment-requests/${id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reject');
            }

            showSuccess('Berhasil', 'Pembayaran ditolak');
            setShowRejectModal(null);
            setRejectReason('');
            mutate('/api/admin/payment-requests');
        } catch (err: unknown) {
            showError('Gagal', err instanceof Error ? err.message : 'Gagal menolak');
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle="Verifikasi Pembayaran" />

            {/* Summary */}
            <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-200">
                            {requests.length} pembayaran menunggu verifikasi
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Verifikasi pembayaran untuk mengaktifkan langganan merchant
                        </p>
                    </div>
                </div>
            </div>

            {/* Payment List */}
            {requests.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Tidak Ada Pembayaran Tertunda
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                        Semua pembayaran sudah diverifikasi
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <div
                            key={req.id}
                            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                {/* Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                            {req.merchantCode}
                                        </span>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {req.merchantName}
                                        </h3>
                                    </div>

                                    <div className="grid gap-2 sm:grid-cols-3 text-sm">
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Jenis:</span>
                                            <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                                {getTypeLabel(req.type)}
                                                {req.monthsRequested && ` (${req.monthsRequested} bulan)`}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Jumlah:</span>
                                            <span className="ml-2 font-bold text-orange-600">
                                                {formatCurrency(req.amount, req.currency)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 dark:text-gray-400">Dikonfirmasi:</span>
                                            <span className="ml-2 text-gray-900 dark:text-white">
                                                {req.confirmedAt ? formatDateTime(req.confirmedAt) : '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {req.transferNotes && (
                                        <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Catatan dari merchant:</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{req.transferNotes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 sm:flex-col sm:items-stretch">
                                    <button
                                        onClick={() => handleVerify(req.id)}
                                        disabled={processingId === req.id}
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium text-white
                      bg-green-600 hover:bg-green-700 disabled:bg-gray-400 transition-colors
                      flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {processingId === req.id ? 'Memproses...' : 'Verifikasi'}
                                    </button>
                                    <button
                                        onClick={() => setShowRejectModal(req.id)}
                                        disabled={processingId === req.id}
                                        className="flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium
                      text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 
                      hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors
                      flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Tolak Pembayaran
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Berikan alasan penolakan yang akan dilihat oleh merchant.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Contoh: Bukti transfer tidak valid, jumlah tidak sesuai, dll."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4
                focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason('');
                                }}
                                className="flex-1 py-2 px-4 rounded-lg font-medium
                  text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700
                  hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={!rejectReason.trim() || processingId === showRejectModal}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white
                  bg-red-600 hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                            >
                                {processingId === showRejectModal ? 'Memproses...' : 'Tolak Pembayaran'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
