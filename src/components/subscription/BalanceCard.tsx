"use client";

import React from "react";
import Link from "next/link";

interface BalanceCardProps {
    balance: number;
    currency: string;
    orderFee: number;
    estimatedOrders: number;
    isLow: boolean;
    lastTopupAt?: Date | null;
}

/**
 * Balance Card Component
 * 
 * Displays merchant balance for deposit mode with top-up action
 */
export default function BalanceCard({
    balance,
    currency,
    orderFee,
    estimatedOrders,
    isLow,
    lastTopupAt
}: BalanceCardProps) {
    const formatCurrency = (amount: number) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    return (
        <div className={`rounded-xl border-2 p-5 transition-all
      ${isLow
                ? 'border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Saldo Deposit
                    </p>
                    <p className={`mt-1 text-3xl font-bold 
            ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                        {formatCurrency(balance)}
                    </p>
                </div>

                {/* Balance icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center
          ${isLow
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}
                >
                    <svg
                        className={`w-6 h-6 ${isLow ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Biaya per Pesanan</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(orderFee)}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Estimasi Pesanan</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                        ~{estimatedOrders} pesanan
                    </p>
                </div>
            </div>

            {/* Low balance warning */}
            {isLow && (
                <div className="mt-4 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                    <span className="text-sm font-medium">Saldo rendah, segera top up!</span>
                </div>
            )}

            {/* Last top up */}
            {lastTopupAt && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                    Top up terakhir: {formatDate(lastTopupAt)}
                </p>
            )}

            {/* Top up button */}
            <Link
                href="/admin/dashboard/subscription/topup"
                className="mt-4 block w-full py-2.5 px-4 rounded-lg text-center font-medium
                    bg-brand-500 hover:bg-brand-600 text-white transition-colors"
            >
                Top Up Sekarang
            </Link>
        </div>
    );
}
