/**
 * Push Notification Settings Component
 * Allows users to enable/disable push notifications
 */

'use client';

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function PushNotificationSettings() {
    const { t } = useTranslation();
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        error,
        subscribe,
        unsubscribe,
    } = usePushNotifications();

    const [showSuccess, setShowSuccess] = useState(false);

    const handleToggle = async () => {
        if (isSubscribed) {
            const success = await unsubscribe();
            if (success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        } else {
            const success = await subscribe();
            if (success) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        }
    };

    if (!isSupported) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {t('subscription.push.title')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('subscription.push.notSupported')}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSubscribed 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                        <svg 
                            className={`w-5 h-5 ${isSubscribed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                            {t('subscription.push.title')}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isSubscribed 
                                ? t('subscription.push.enabled')
                                : t('subscription.push.disabled')
                            }
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggle}
                    disabled={isLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                        isSubscribed 
                            ? 'bg-brand-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isSubscribed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>

            {/* Permission denied warning */}
            {permission === 'denied' && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {t('subscription.push.permissionDenied')}
                    </p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {/* Success message */}
            {showSuccess && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-600 dark:text-green-400">
                        {isSubscribed 
                            ? t('subscription.push.subscribeSuccess')
                            : t('subscription.push.unsubscribeSuccess')
                        }
                    </p>
                </div>
            )}

            {/* Description */}
            <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                {t('subscription.push.description')}
            </p>
        </div>
    );
}
