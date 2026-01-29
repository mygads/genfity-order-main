'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { clearCustomerAuth, getCustomerAuth } from '@/lib/utils/localStorage';
import { getCurrentInternalPathWithQuery } from '@/lib/utils/safeRef';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageSelectorModal from '@/components/customer/LanguageSelectorModal';
import {
  customerHelpCenterUrl,
  customerHistoryUrl,
  customerLoginUrl,
  customerMerchantHomeUrl,
  customerPrivacyPolicyUrl,
  customerProfileEditUrl,
  customerProfileUrl,
} from '@/lib/utils/customerRoutes';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';
import {
  FaArrowLeft,
  FaChevronRight,
  FaFileAlt,
  FaQuestionCircle,
  FaShieldAlt,
  FaSignOutAlt,
  FaUserCircle,
} from 'react-icons/fa';

function ProfileContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t, localeFlag, localeName } = useTranslation();

  const [auth, setAuth] = useState(getCustomerAuth());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const merchantCode = typeof params.merchantCode === 'string' ? (params.merchantCode as string) : undefined;
  const mode = searchParams.get('mode') || 'dinein';
  const fallbackRef = merchantCode ? customerMerchantHomeUrl(merchantCode) : '/merchant';

  const { pushBack } = useCustomerBackTarget({ fallback: fallbackRef });

  const handleLogin = () => {
    const currentRef = getCurrentInternalPathWithQuery();
    router.push(
      customerLoginUrl({
        merchant: merchantCode,
        mode,
        ref: currentRef ?? customerProfileUrl(merchantCode, { mode }),
      })
    );
  };

  const handleLogout = () => {
    clearCustomerAuth();
    setAuth(null);
    setShowLogoutConfirm(false);
  };

  const handleEditProfile = () => {
    const currentRef = getCurrentInternalPathWithQuery();
    router.push(customerProfileEditUrl(merchantCode, { mode, ref: currentRef ?? customerProfileUrl(merchantCode, { mode }) }));
  };

  const handleOrderHistory = () => {
    const currentRef = getCurrentInternalPathWithQuery();
    router.push(customerHistoryUrl(merchantCode, { mode, ref: currentRef ?? customerProfileUrl(merchantCode, { mode }) }));
  };

  const handleHelpCenter = () => {
    const currentRef = getCurrentInternalPathWithQuery();
    router.push(customerHelpCenterUrl(merchantCode, { mode, ref: currentRef ?? customerProfileUrl(merchantCode, { mode }) }));
  };

  const handlePrivacyPolicy = () => {
    const currentRef = getCurrentInternalPathWithQuery();
    if (merchantCode) {
      router.push(customerPrivacyPolicyUrl(merchantCode, { mode, ref: currentRef ?? customerProfileUrl(merchantCode, { mode }) }));
      return;
    }

    router.push(`/privacy-policy?mode=${encodeURIComponent(mode)}&ref=${encodeURIComponent(currentRef ?? customerProfileUrl(undefined, { mode }))}`);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button onClick={pushBack} className="w-10 h-10 flex items-center justify-center -ml-2" aria-label="Back">
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">{t('customer.profile.title')}</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {/* User Section */}
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div className="w-18 h-18 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {auth ? (
              <span className="text-xl font-bold text-gray-600">{auth.customer.name.charAt(0).toUpperCase()}</span>
            ) : (
              <FaUserCircle className="w-9 h-9 text-gray-400" />
            )}
          </div>

          {/* User Info or Guest Prompt */}
          <div className="flex-1">
            {auth ? (
              <>
                <h2 className="text-base font-semibold text-gray-900">Hi, {auth.customer.name}</h2>
                <p className="text-sm text-gray-500">{auth.customer.phone || auth.customer.email}</p>
              </>
            ) : (
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-2">{t('auth.loginAsGuest')}</h2>
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
            <button onClick={handleEditProfile} className="text-orange-500 hover:text-orange-600 text-sm font-medium">
              {t('common.edit')}
            </button>
          )}
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {/* Order History */}
          <button
            onClick={handleOrderHistory}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow"
          >
            <FaFileAlt className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-sm font-medium text-gray-700">{t('customer.profile.orderHistory')}</span>
          </button>

          {/* Help Center */}
          <button
            onClick={handleHelpCenter}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow"
          >
            <FaQuestionCircle className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-sm font-medium text-gray-700">{t('customer.profile.helpCenter')}</span>
          </button>

          {/* Language Selector */}
          <button
            onClick={() => setShowLanguageModal(true)}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow"
          >
            <span className="text-xl">{localeFlag}</span>
            <span className="flex-1 text-left text-sm font-medium text-gray-700">{t('common.language')}</span>
            <span className="text-sm text-gray-500">{localeName}</span>
            <FaChevronRight className="w-4 h-4 text-gray-400" />
          </button>

          {/* Privacy Policy */}
          <button
            onClick={handlePrivacyPolicy}
            className="w-full flex items-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow"
          >
            <FaShieldAlt className="w-5 h-5 text-gray-600" />
            <span className="flex-1 text-left text-sm font-medium text-gray-700">{t('customer.profile.privacyPolicy')}</span>
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
            <FaSignOutAlt className="w-5 h-5" />
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
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
            .animate-fade-in {
              animation: fadeIn 0.3s ease-out;
            }
            .animate-slide-up {
              animation: slideUp 0.3s ease-out;
            }
          `}</style>

          {/* Overlay */}
          <div className="fixed inset-0 bg-black/50 z-[300] animate-fade-in" onClick={() => setShowLogoutConfirm(false)} />

          {/* Bottom Sheet Modal */}
          <div className="fixed bottom-0 left-0 right-0 z-[301] animate-slide-up" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div
              style={{
                backgroundColor: 'white',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px 16px',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-center mb-2"
                style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A', lineHeight: '24px' }}
              >
                {t('customer.profile.signOutConfirm')}
              </h3>
              <p className="text-center mb-6" style={{ fontSize: '14px', color: '#666', lineHeight: '20px' }}>
                {t('customer.profile.signOutMessage')}
              </p>

              <div className="flex justify-between gap-3" style={{ padding: '0 8px' }}>
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
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t('common.yes')}
                </button>
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
                    transition: 'all 0.2s ease',
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
      <LanguageSelectorModal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
    </div>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />}>
      <ProfileContent />
    </Suspense>
  );
}
