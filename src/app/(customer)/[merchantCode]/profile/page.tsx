'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth, clearCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

/**
 * Profile Page - Burjo ESB Style
 * 
 * Shows:
 * - Guest login prompt if not authenticated (with Login button)
 * - User info (Hi, Name + phone) with Edit button if authenticated
 * - Order History link
 * - Logout button if authenticated
 * - Powered By footer
 */

function ProfileContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [auth, setAuth] = useState(getCustomerAuth());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const merchantCode = params.merchantCode as string;
  const mode = searchParams.get('mode') || 'dinein';
  const ref = searchParams.get('ref') || `/${merchantCode}/order?mode=${mode}`;

  const handleBack = () => {
    if (ref) {
      router.push(decodeURIComponent(ref));
    } else {
      router.back();
    }
  };

  const handleLogin = () => {
    router.push(`/login?ref=${encodeURIComponent(`/${merchantCode}/profile?mode=${mode}`)}`);
  };

  const handleLogout = () => {
    console.log('🔐 [PROFILE] Logout initiated');

    // Clear auth from localStorage (will dispatch event)
    clearCustomerAuth();

    // Update local state
    setAuth(null);
    setShowLogoutConfirm(false);
    console.log('🔐 [PROFILE] Auth state cleared');
  };

  const handleEditProfile = () => {
    router.push(`/${merchantCode}/edit-profile?mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/profile?mode=${mode}`)}`);
  };

  const handleOrderHistory = () => {
    router.push(`/${merchantCode}/history?mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/profile?mode=${mode}`)}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-base pr-10">
            Profile
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* User Section */}
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div className="w-18 h-18 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            {auth ? (
              <span className="text-xl font-bold text-gray-600 dark:text-gray-300">
                {auth.customer.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <circle cx="12" cy="8" r="4" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
            )}
          </div>

          {/* User Info or Guest Prompt */}
          <div className="flex-1">
            {auth ? (
              <>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Hi, {auth.customer.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {auth.customer.phone || auth.customer.email}
                </p>
              </>
            ) : (
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  Login as Guest
                </h2>
                <button
                  onClick={handleLogin}
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Edit Button (only if logged in) */}
          {auth && (
            <button
              onClick={handleEditProfile}
              className="text-orange-500 hover:text-orange-600 text-sm font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {/* Order History */}
          <button
            onClick={handleOrderHistory}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M16 13H8" />
              <path d="M16 17H8" />
              <path d="M10 9H8" />
            </svg>
            <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              Order History
            </span>
          </button>

          {/* Privacy Policy */}
          <button
            onClick={() => router.push(`/${merchantCode}/privacy-policy?mode=${mode}&ref=${encodeURIComponent(`/${merchantCode}/profile?mode=${mode}`)}`)}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-400">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              Privacy Policy
            </span>
          </button>
        </div>
      </div>

      {/* Footer - Logout Button (only if logged in) */}
      {auth && (
        <div className="px-4 py-6">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-orange-500 hover:text-orange-600 font-medium transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      )}

      {/* Powered By Footer */}
      <div className="py-4 text-center text-xs text-gray-400">
        Powered By <span className="font-semibold">GENFITY</span>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[300]"
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] max-w-[320px] bg-white dark:bg-gray-800 rounded-xl z-[300] p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Sign Out?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You will be signed out from your account
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 h-11 border-2 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-semibold rounded-xl hover:border-gray-400 dark:hover:border-gray-600 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-11 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-all active:scale-[0.98]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Profile Page with Suspense wrapper
 */
export default function ProfilePage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />}>
      <ProfileContent />
    </Suspense>
  );
}
