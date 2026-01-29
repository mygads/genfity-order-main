'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import { getCustomerAuth, saveCustomerAuth } from '@/lib/utils/localStorage';
import { customerLoginUrl, customerProfileUrl } from '@/lib/utils/customerRoutes';
import { getCurrentInternalPathWithQuery } from '@/lib/utils/safeRef';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useCustomerBackTarget } from '@/hooks/useCustomerBackTarget';

function EditProfileContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [auth, setAuth] = useState(getCustomerAuth());
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const merchantCode = params.merchantCode as string | undefined;
  const mode = searchParams.get('mode') || 'dinein';

  const fallbackRef = customerProfileUrl(merchantCode, { mode });
  const { pushBack } = useCustomerBackTarget({ fallback: fallbackRef });

  useEffect(() => {
    if (!auth) {
      const currentRef = getCurrentInternalPathWithQuery();
      router.push(
        customerLoginUrl({
          merchant: merchantCode,
          mode,
          ref: currentRef ?? customerProfileUrl(merchantCode, { mode }),
        })
      );
      return;
    }

    setName(auth.customer.name || '');
    setPhone(auth.customer.phone || '');
    setEmail(auth.customer.email || '');
  }, [auth, router, merchantCode, mode]);

  const handleSave = async () => {
    if (!auth) return;

    if (!name.trim()) {
      setError(t('auth.error.nameRequired'));
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedAuth = {
          ...auth,
          customer: {
            ...auth.customer,
            name: name.trim(),
            email: email.trim() || auth.customer.email,
          },
        };
        saveCustomerAuth(updatedAuth);
        setAuth(updatedAuth);
        setSuccess(true);

        setTimeout(() => {
          pushBack();
        }, 1000);
      } else {
        setError(data.message || t('customer.profile.updateFailed'));
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(t('customer.profile.updateFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!auth) {
    return <LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={pushBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.profile.editProfile')}
          </h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{t('customer.profile.profileUpdated')}</p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm text-gray-500 mb-2">
            {t('auth.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-white border-b border-gray-300 text-gray-900 text-base focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Your name"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-500 mb-2">
            {t('auth.phoneNumber')}
          </label>
          <input
            type="text"
            value={phone}
            disabled
            className="w-full px-4 py-3 bg-gray-100 border-b border-gray-300 text-gray-400 text-base cursor-not-allowed"
            placeholder="Phone number"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-gray-500 mb-2">
            {t('auth.email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white border-b border-gray-300 text-gray-900 text-base focus:outline-none focus:border-orange-500 transition-colors"
            placeholder="Your email"
          />
        </div>
      </div>

      <div className="sticky bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-base font-semibold rounded-lg transition-colors flex items-center justify-center"
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              {t('common.saving')}
            </>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </div>
  );
}

export default function CustomerEditProfilePage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />}>
      <EditProfileContent />
    </Suspense>
  );
}
