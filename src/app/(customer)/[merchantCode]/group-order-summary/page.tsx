'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { formatCurrency } from '@/lib/utils/format';

/**
 * Group Order Summary Page
 * 
 * Shows the split bill breakdown after a group order is submitted.
 * Displays each participant's share of the total bill.
 */
export default function GroupOrderSummaryPage({
    params,
}: {
    params: Promise<{ merchantCode: string }>;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { session, splitBill, clearGroupOrderState } = useGroupOrder();

    const [merchantCode, setMerchantCode] = useState<string>('');
    const [currency, setCurrency] = useState<string>('AUD');

    useEffect(() => {
        params.then(p => {
            setMerchantCode(p.merchantCode);
        });
    }, [params]);

    // Get order number from URL if navigated from submit
    const orderNumber = searchParams.get('orderNumber') || session?.order?.orderNumber;

    // If no session or split bill, redirect back
    useEffect(() => {
        if (!session && !splitBill) {
            router.replace(`/${merchantCode || ''}`);
        }
    }, [session, splitBill, merchantCode, router]);

    useEffect(() => {
        // Fetch merchant currency
        if (merchantCode) {
            fetch(`/api/public/merchants/${merchantCode}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setCurrency(data.data.currency || 'AUD');
                    }
                })
                .catch(console.error);
        }
    }, [merchantCode]);

    const handleDone = () => {
        clearGroupOrderState();
        router.push(`/${merchantCode}`);
    };

    const handleTrackOrder = () => {
        if (orderNumber) {
            router.push(`/${merchantCode}/track/${orderNumber}`);
        }
    };

    if (!session && !splitBill) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    const totalAmount = session?.order?.totalAmount ||
        (splitBill || []).reduce((sum, p) => sum + p.total, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-8 text-center text-white">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2">
                    {t("groupOrder.success.submitted") || "Order Submitted!"}
                </h1>
                {orderNumber && (
                    <p className="text-green-100 text-lg font-mono">
                        #{orderNumber}
                    </p>
                )}
            </div>

            {/* Split Bill Section */}
            <div className="px-4 py-6 -mt-4">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💸</span>
                            <div>
                                <h2 className="font-semibold text-gray-900">
                                    {t("groupOrder.splitBill") || "Split Bill"}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {(splitBill || []).length} participants
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Participant Breakdown */}
                    <div className="divide-y divide-gray-100">
                        {(splitBill || []).map((participant, _index) => (
                            <div key={participant.participantId} className="px-5 py-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${participant.isHost
                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                            }`}>
                                            {participant.participantName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">
                                                    {participant.participantName}
                                                </span>
                                                {participant.isHost && (
                                                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                                        Host
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Subtotal: {formatCurrency(participant.subtotal, currency)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-gray-900">
                                            {formatCurrency(participant.total, currency)}
                                        </div>
                                        {(participant.taxShare > 0 || participant.serviceChargeShare > 0) && (
                                            <div className="text-xs text-gray-400">
                                                incl. fees
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">
                                Total Order
                            </span>
                            <span className="text-xl font-bold text-green-600">
                                {formatCurrency(totalAmount, currency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="px-4 pb-6 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">💡</span>
                        <div>
                            <h3 className="font-medium text-blue-800 mb-1">
                                How to pay
                            </h3>
                            <p className="text-sm text-blue-600">
                                Each participant pays their share at the counter. Show this screen to the staff.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-[500px] mx-auto">
                <div className="flex gap-3">
                    {orderNumber && (
                        <button
                            onClick={handleTrackOrder}
                            className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Track Order
                        </button>
                    )}
                    <button
                        onClick={handleDone}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
