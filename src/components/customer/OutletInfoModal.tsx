'use client';

import { useEffect } from 'react';

interface OpeningHour {
    id: string | bigint;
    dayOfWeek: number;
    isClosed: boolean;
    is24Hours: boolean;
    openTime?: string;
    closeTime?: string;
}

interface MerchantInfo {
    name: string;
    address?: string;
    phone?: string;
    openingHours: OpeningHour[];
}

interface OutletInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    merchant: MerchantInfo;
}

const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export default function OutletInfoModal({ isOpen, onClose, merchant }: OutletInfoModalProps) {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Get current day of week
    const currentDay = new Date().getDay();

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
                <div className="w-full max-w-[420px] bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl pointer-events-auto animate-slide-up">

                    {/* Header */}
                    <header className="relative shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center px-4 py-3">
                            <button
                                onClick={onClose}
                                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Close"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <div className="flex-1 text-center font-semibold text-gray-900 dark:text-white">
                                Outlet Info
                            </div>
                            <div className="w-10"></div>
                        </div>
                    </header>                    {/* Content */}
                    <div className="max-h-[80vh] overflow-y-auto">
                        {/* Merchant Name & Address */}
                        <div className="relative px-4 py-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {merchant.name}
                            </h2>

                            {merchant.address && (
                                <div className="flex gap-2 mt-2">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 shrink-0 mt-0.5">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    <div className="flex-1 text-xs font-light text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {merchant.address}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Contact Actions */}
                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                            {merchant.phone && (
                                <a
                                    href={`tel:${merchant.phone}`}
                                    className="flex-1 flex items-center justify-center ml-4 gap-2 px-3 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                    </svg>
                                    Contact us
                                </a>
                            )}

                            {merchant.address && (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.address)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 mr-4 px-3 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    Visit us
                                </a>
                            )}
                        </div>

                        {/* Operating Hours */}
                        <div className="px-4 py-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                Operational Hours
                            </h3>

                            <div>
                                {merchant.openingHours
                                    .sort((a, b) => {
                                        // Sort: Monday first, then rest of week, Sunday last
                                        const aDay = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
                                        const bDay = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
                                        return aDay - bDay;
                                    })
                                    .map((hours, index) => {
                                        const isToday = hours.dayOfWeek === currentDay;
                                        const isLast = index === merchant.openingHours.length - 1;
                                        return (
                                            <div key={hours.id.toString()}>
                                                <div className="flex items-center justify-between py-3">
                                                    <span className={`text-xs uppercase pl-3 ${isToday
                                                        ? 'text-gray-900 dark:text-white font-bold'
                                                        : 'text-gray-400 dark:text-gray-500 font-light'
                                                        }`}>
                                                        {dayNames[hours.dayOfWeek]}
                                                    </span>

                                                    <span className={`text-xs ${isToday
                                                        ? 'text-gray-900 dark:text-white font-medium'
                                                        : 'text-gray-500 dark:text-gray-400 font-normal'
                                                        }`}>
                                                        {hours.isClosed
                                                            ? 'Closed'
                                                            : hours.is24Hours
                                                                ? 'Open 24 hours'
                                                                : `${hours.openTime} - ${hours.closeTime}`}
                                                    </span>
                                                </div>
                                                {!isLast && (
                                                    <div className="ml-3 mr-0">
                                                        <div className="border-b border-gray-200 dark:border-gray-700"></div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </>
    );
}
