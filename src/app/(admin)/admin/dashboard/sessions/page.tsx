/**
 * Device/Session Management Page
 * Route: /admin/dashboard/sessions
 * Access: All logged-in admin users
 * 
 * Features:
 * - View all active login sessions/devices
 * - See device info, IP address, last activity
 * - Identify current device
 * - Revoke sessions (sign out from other devices)
 */

'use client';

import { useState, useCallback } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import ToastContainer from '@/components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FaDesktop, FaMobileAlt, FaTabletAlt, FaSignOutAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { UAParser } from 'ua-parser-js';

interface Session {
    id: string;
    deviceInfo: string;
    ipAddress: string;
    lastActivityAt: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
}

interface SessionsApiResponse {
    success: boolean;
    data: Session[];
}

export default function SessionsPage() {
    const { t } = useTranslation();
    const { toasts, success: showSuccessToast, error: showErrorToast } = useToast();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    // Fetch sessions using SWR
    const {
        data: sessionsResponse,
        error: sessionsError,
        isLoading,
        mutate: mutateSessions
    } = useSWRWithAuth<SessionsApiResponse>('/api/admin/sessions', {
        refreshInterval: 30000, // Auto-refresh every 30 seconds
    });

    const sessions = sessionsResponse?.success ? sessionsResponse.data : [];

    // Parse user agent to get readable device info
    const parseDeviceInfo = (userAgent: string) => {
        const parser = new UAParser();
        const result = parser.setUA(userAgent).getResult();

        const browser = result.browser.name || 'Unknown Browser';
        const browserVersion = result.browser.version ? ` ${result.browser.version.split('.')[0]}` : '';
        const os = result.os.name || 'Unknown OS';
        const osVersion = result.os.version ? ` ${result.os.version}` : '';

        return {
            browser: `${browser}${browserVersion}`,
            os: `${os}${osVersion}`,
            device: result.device.type || 'desktop',
            fullName: `${browser}${browserVersion} on ${os}${osVersion}`
        };
    };

    // Parse device info to determine device type
    const getDeviceIcon = (userAgent: string) => {
        const deviceInfo = parseDeviceInfo(userAgent);

        if (deviceInfo.device === 'mobile') {
            return <FaMobileAlt className="h-5 w-5" />;
        }
        if (deviceInfo.device === 'tablet') {
            return <FaTabletAlt className="h-5 w-5" />;
        }
        return <FaDesktop className="h-5 w-5" />;
    };

    // Format relative time
    const getRelativeTime = (dateString: string) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now.getTime() - past.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return t('admin.sessions.justNow');
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;

        return past.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // Format full date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Revoke session
    const handleRevokeSession = async (sessionId: string) => {
        if (!confirm(t('admin.sessions.confirmRevoke'))) {
            return;
        }

        setRevokingId(sessionId);

        try {
            const token = getAdminToken();
            const response = await fetch('/api/admin/sessions', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ sessionId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showSuccessToast(t('admin.sessions.revokeSuccess'), t('admin.sessions.revokeSuccess'));
                mutateSessions(); // Refresh session list
            } else {
                showErrorToast(t('admin.sessions.revokeFailed'), data.error || t('admin.sessions.revokeFailed'));
            }
        } catch (error) {
            console.error('Error revoking session:', error);
            showErrorToast(t('admin.sessions.revokeError'), t('admin.sessions.revokeError'));
        } finally {
            setRevokingId(null);
        }
    };

    // Loading skeleton
    if (isLoading) {
        return (
            <div>
                <PageBreadcrumb pageTitle={t('admin.sessions.pageTitle')} />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 w-48 bg-gray-200 rounded dark:bg-gray-800" />
                        <div className="h-4 w-96 bg-gray-200 rounded dark:bg-gray-800" />
                        <div className="mt-6 space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-gray-100 rounded dark:bg-gray-800/50" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (sessionsError) {
        return (
            <div>
                <PageBreadcrumb pageTitle={t('admin.sessions.pageTitle')} />
                <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
                    <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                            <FaExclamationTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{t('admin.sessions.errorLoading')}</h2>
                        <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            {sessionsError?.message || t('admin.sessions.errorMessage')}
                        </p>
                        <button
                            onClick={() => mutateSessions()}
                            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                        >
                            {t('admin.sessions.retry')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle={t('admin.sessions.pageTitle')} />

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
                <div className="mb-5">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                        {t('admin.sessions.title')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.sessions.description')}
                    </p>
                </div>

                {/* Sessions Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
                    <div className="overflow-x-auto">
                        <table className="min-w-full w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/[0.05] dark:bg-white/[0.02]">
                                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.deviceBrowser')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.ipAddress')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.lastActivity')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.signedIn')}
                                    </th>
                                    <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.status')}
                                    </th>
                                    <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('admin.sessions.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                {sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('admin.sessions.noSessions')}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map((session) => (
                                        <tr
                                            key={session.id}
                                            className={session.isCurrent ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex items-center justify-center rounded-lg p-2 ${session.isCurrent
                                                        ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400'
                                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}>
                                                        {getDeviceIcon(session.deviceInfo)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                                                            {parseDeviceInfo(session.deviceInfo).browser}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {parseDeviceInfo(session.deviceInfo).os}
                                                        </div>
                                                        {session.isCurrent && (
                                                            <div className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 mt-0.5">
                                                                <FaCheckCircle className="h-3 w-3" />
                                                                {t('admin.sessions.currentDevice')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {session.ipAddress}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="text-sm text-gray-800 dark:text-white/90">
                                                    {getRelativeTime(session.lastActivityAt)}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                                    {formatDate(session.lastActivityAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                                {formatDate(session.createdAt)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${session.isCurrent
                                                    ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${session.isCurrent ? 'bg-success-600' : 'bg-gray-600'
                                                        }`} />
                                                    {session.isCurrent ? t('admin.sessions.statusActive') : t('admin.sessions.statusSignedIn')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-end">
                                                {!session.isCurrent && (
                                                    <button
                                                        onClick={() => handleRevokeSession(session.id)}
                                                        disabled={revokingId === session.id}
                                                        className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        <FaSignOutAlt className="h-3.5 w-3.5" />
                                                        {revokingId === session.id ? t('admin.sessions.revoking') : t('admin.sessions.signOut')}
                                                    </button>
                                                )}
                                                {session.isCurrent && (
                                                    <span className="text-sm text-gray-400 dark:text-gray-500">
                                                        {t('admin.sessions.thisDevice')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sessions count */}
                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {sessions.length} {sessions.length === 1 ? t('admin.sessions.sessionCount') : t('admin.sessions.sessionCountPlural')}
                </div>
            </div>

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} />
        </div>
    );
}
