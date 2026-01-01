"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface TrialBannerProps {
    daysRemaining: number;
    onDismiss?: () => void;
}

/**
 * Trial Banner Component
 * 
 * Fixed position banner in bottom-right corner showing trial days remaining
 * Dismissible per session using sessionStorage
 */
export default function TrialBanner({ daysRemaining, onDismiss }: TrialBannerProps) {
    const { t } = useTranslation();
    const [isDismissed, setIsDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already dismissed this session
        const dismissed = sessionStorage.getItem('trial-banner-dismissed');
        if (dismissed) {
            setIsDismissed(true);
        } else {
            // Delay show for smooth entrance
            setTimeout(() => setIsVisible(true), 500);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => {
            setIsDismissed(true);
            sessionStorage.setItem('trial-banner-dismissed', 'true');
            onDismiss?.();
        }, 300);
    };

    if (isDismissed) {
        return null;
    }

    const urgencyLevel = daysRemaining <= 3 ? 'urgent' : daysRemaining <= 7 ? 'warning' : 'normal';

    const bgClass = {
        urgent: 'from-red-500 to-orange-500',
        warning: 'from-orange-500 to-amber-500',
        normal: 'from-amber-500 to-yellow-500',
    }[urgencyLevel];

    const textClass = {
        urgent: 'text-red-50',
        warning: 'text-orange-50',
        normal: 'text-amber-50',
    }[urgencyLevel];

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
        >
            <div className={`bg-gradient-to-r ${bgClass} rounded-xl shadow-lg p-4 min-w-[280px] max-w-[320px]`}>
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center
            text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Gift icon */}
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                        <svg className={`w-6 h-6 ${textClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                            />
                        </svg>
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${textClass}`}>
                            {t("subscription.trial.title")}
                        </p>
                        <p className={`text-sm ${textClass} opacity-90`}>
                            {daysRemaining > 0 ? (
                                t("subscription.trial.daysRemaining").replace("{days}", String(daysRemaining))
                            ) : (
                                <span className="font-bold">{t("subscription.trial.endsToday")}</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Upgrade button */}
                <Link
                    href="/admin/dashboard/subscription/topup"
                    className={`mt-3 block w-full py-2 px-4 rounded-lg text-center font-medium
            bg-white text-gray-800 hover:bg-gray-100 transition-colors shadow-sm`}
                >
                    {t("subscription.trial.upgradeNow")}
                </Link>
            </div>
        </div>
    );
}
