'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth, clearCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSelectorModal from '@/components/customer/LanguageSelectorModal';

/**
 * Profile Page - Burjo ESB Style
 * 
 * Shows:
 * - Guest login prompt if not authenticated (with Login button)
 * - User info (Hi, Name + phone) with Edit button if authenticated
 * - Order History link
 * - Language selector
 * - Logout button if authenticated
 * - Powered By footer
 */

function ProfileContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, localeFlag, localeName } = useTranslation();

  const [auth, setAuth] = useState(getCustomerAuth());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

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
            {t('customer.profile.title')}
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
                  {t('auth.loginAsGuest')}
                </h2>
                <button
                  onClick={handleLogin}
                  className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {t('auth.login')}
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
              {t('common.edit')}
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
              {t('customer.profile.orderHistory')}
            </span>
          </button>

          {/* Language Selector */}
          <button
            onClick={() => setShowLanguageModal(true)}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow dark:text-gray-400"
          >
            <span className="text-xl">{localeFlag}</span>
            <span className="flex-1 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('common.language')}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {localeName}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <path d="M9 18l6-6-6-6" />
            </svg>
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
              {t('customer.profile.privacyPolicy')}
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
            {t('auth.logout')}
          </button>
        </div>
      )}

      {/* Powered By Footer */}
      <div className="py-4">
        <PoweredByFooter />
      </div>

      {/* Logout Confirmation Modal - ESB Bottom Sheet Style */}
      {showLogoutConfirm && (
        <>
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-fade-in { animation: fadeIn 0.3s ease-out; }
            .animate-slide-up { animation: slideUp 0.3s ease-out; }
          `}</style>

          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[300] animate-fade-in"
            onClick={() => setShowLogoutConfirm(false)}
          />

          {/* Bottom Sheet Modal */}
          <div
            className="fixed bottom-0 left-0 right-0 z-[301] animate-slide-up"
            style={{
              maxWidth: '500px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 16px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <h3
                className="text-center mb-2"
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1A1A1A',
                  lineHeight: '24px'
                }}
              >
                Log out from your account?
              </h3>

              {/* Subtitle */}
              <p
                className="text-center mb-6"
                style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '20px'
                }}
              >
                Vouchers/promos you&apos;ve applied will be automatically removed.
              </p>

              {/* Buttons Row - ESB Style */}
              <div
                className="flex justify-between gap-3"
                style={{ padding: '0 8px' }}
              >
                {/* Yes Button - Outline Orange */}
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1,
                    height: '48px',
                    backgroundColor: 'white',
                    border: '1px solid #F05A28',
                    borderRadius: '8px',
                    color: '#F05A28',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t('common.yes')}
                </button>

                {/* No Button - Primary Orange */}
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{
                    flex: 1,
                    height: '48px',
                    backgroundColor: '#F05A28',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
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
