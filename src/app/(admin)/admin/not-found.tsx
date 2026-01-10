'use client';

import Link from 'next/link';
import { FaExclamationTriangle, FaHome, FaArrowLeft } from 'react-icons/fa';

/**
 * Admin 404 Not Found Page
 * 
 * Styled for admin dashboard with dark theme support
 */
export default function AdminNotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30">
                        <FaExclamationTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>

                {/* Error Code */}
                <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                    404
                </h1>

                {/* Title */}
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Page Not Found
                </h2>

                {/* Description */}
                <p className="text-gray-500 dark:text-gray-400 mb-8">
                    The page you are looking for doesn&apos;t exist or has been moved.
                    Please check the URL or navigate back to the dashboard.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/admin/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
                    >
                        <FaHome className="w-4 h-4" />
                        Go to Dashboard
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
                    >
                        <FaArrowLeft className="w-4 h-4" />
                        Go Back
                    </button>
                </div>

                {/* Footer */}
                <p className="mt-10 text-xs text-gray-400 dark:text-gray-500">
                    If you believe this is an error, please contact support.
                </p>
            </div>
        </div>
    );
}
