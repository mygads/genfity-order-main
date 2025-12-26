"use client";

import React from "react";
import Link from "next/link";

interface SuspendedAlertProps {
    reason?: string;
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
}

/**
 * Suspended Alert Component
 * 
 * Full-width banner at top of dashboard when subscription is suspended
 * Not dismissible - requires action
 */
export default function SuspendedAlert({ reason, type }: SuspendedAlertProps) {
    const getMessage = () => {
        switch (type) {
            case 'TRIAL':
                return 'Masa trial Anda telah berakhir.';
            case 'DEPOSIT':
                return 'Saldo deposit Anda telah habis.';
            case 'MONTHLY':
                return 'Langganan bulanan Anda telah berakhir.';
            default:
                return reason || 'Langganan Anda telah ditangguhkan.';
        }
    };

    return (
        <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    {/* Warning icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">
                            Toko Tidak Dapat Menerima Pesanan
                        </h3>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {getMessage()} Silakan perbarui langganan untuk melanjutkan operasional.
                        </p>
                    </div>
                </div>

                <Link
                    href="/admin/dashboard/subscription/topup"
                    className="flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 
            bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors
            text-sm sm:text-base"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    Perbarui Langganan
                </Link>
            </div>
        </div>
    );
}
