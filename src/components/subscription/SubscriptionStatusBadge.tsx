"use client";

import React from "react";

interface SubscriptionStatusBadgeProps {
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    daysRemaining?: number | null;
    balance?: number | null;
    currency?: string;
    size?: 'sm' | 'md' | 'lg';
}

/**
 * Subscription Status Badge Component
 * 
 * Displays subscription type and status with color coding
 */
export default function SubscriptionStatusBadge({
    type,
    status,
    daysRemaining,
    balance,
    currency = 'IDR',
    size = 'md'
}: SubscriptionStatusBadgeProps) {
    const formatCurrency = (amount: number) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const getTypeDisplay = () => {
        switch (type) {
            case 'TRIAL':
                return {
                    label: 'Trial',
                    sublabel: daysRemaining !== null && daysRemaining !== undefined
                        ? `${daysRemaining} hari`
                        : null,
                    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
                    textClass: 'text-amber-800 dark:text-amber-200',
                    dotClass: 'bg-amber-500',
                };
            case 'DEPOSIT':
                return {
                    label: 'Deposit',
                    sublabel: balance !== null && balance !== undefined
                        ? formatCurrency(balance)
                        : null,
                    bgClass: 'bg-green-100 dark:bg-green-900/30',
                    textClass: 'text-green-800 dark:text-green-200',
                    dotClass: 'bg-green-500',
                };
            case 'MONTHLY':
                return {
                    label: 'Bulanan',
                    sublabel: daysRemaining !== null && daysRemaining !== undefined
                        ? `${daysRemaining} hari`
                        : null,
                    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
                    textClass: 'text-blue-800 dark:text-blue-200',
                    dotClass: 'bg-blue-500',
                };
        }
    };

    const getSuspendedStyle = () => ({
        label: 'Ditangguhkan',
        sublabel: null,
        bgClass: 'bg-red-100 dark:bg-red-900/30',
        textClass: 'text-red-800 dark:text-red-200',
        dotClass: 'bg-red-500',
    });

    const display = status === 'SUSPENDED' || status === 'CANCELLED'
        ? getSuspendedStyle()
        : getTypeDisplay();

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
    }[size];

    const dotSizeClasses = {
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-2.5 h-2.5',
    }[size];

    return (
        <span className={`inline-flex items-center gap-2 rounded-full font-medium ${sizeClasses} ${display.bgClass} ${display.textClass}`}>
            <span className={`${dotSizeClasses} rounded-full ${display.dotClass}`} />
            <span>{display.label}</span>
            {display.sublabel && (
                <span className="opacity-75">({display.sublabel})</span>
            )}
        </span>
    );
}
