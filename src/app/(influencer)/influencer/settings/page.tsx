'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInfluencer } from '../layout';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { InfluencerSettingsSkeleton } from '@/components/common/SkeletonLoaders';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';

interface InfluencerData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  country: string;
  defaultCurrency: string;
  profilePictureUrl?: string;
  bankNameIdr?: string;
  bankAccountNumberIdr?: string;
  bankAccountHolderIdr?: string;
  bankNameAud?: string;
  bankAccountNumberAud?: string;
  bankAccountHolderAud?: string;
  bsbAud?: string;
}

export default function InfluencerSettingsPage() {
  const router = useRouter();
  const { setIsSidebarOpen } = useInfluencer();
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Bank details form
  const [formData, setFormData] = useState({
    bankNameIdr: '',
    bankAccountNumberIdr: '',
    bankAccountHolderIdr: '',
    bankNameAud: '',
    bankAccountNumberAud: '',
    bankAccountHolderAud: '',
    bsbAud: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    try {
      const response = await fetch('/api/influencer/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        localStorage.removeItem('influencerAccessToken');
        router.push('/influencer/login');
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setInfluencer(data.data);
        setFormData({
          bankNameIdr: data.data.bankNameIdr || '',
          bankAccountNumberIdr: data.data.bankAccountNumberIdr || '',
          bankAccountHolderIdr: data.data.bankAccountHolderIdr || '',
          bankNameAud: data.data.bankNameAud || '',
          bankAccountNumberAud: data.data.bankAccountNumberAud || '',
          bankAccountHolderAud: data.data.bankAccountHolderAud || '',
          bsbAud: data.data.bsbAud || '',
        });
      }
    } catch {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setIsSaving(true);

    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    try {
      const response = await fetch('/api/influencer/bank-details', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveError(data.message || 'Failed to save bank details');
        setIsSaving(false);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      fetchData();
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <InfluencerHeader title="Settings" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <InfluencerSettingsSkeleton />
        </main>
      </>
    );
  }

  if (error || !influencer) {
    return (
      <>
        <InfluencerHeader title="Settings" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error || 'Failed to load data'}</p>
              <button onClick={fetchData} className="px-4 py-2 bg-brand-500 text-white rounded-lg">
                Retry
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <InfluencerHeader title="Settings" onMenuClick={() => setIsSidebarOpen(true)} />

      <main className="p-4 lg:p-8 max-w-4xl">
        {/* Profile Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-2xl font-bold">
                {influencer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{influencer.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{influencer.email}</p>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</p>
                <p className="font-medium text-gray-900 dark:text-white">{influencer.phone || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Country</p>
                <p className="font-medium text-gray-900 dark:text-white">{influencer.country}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Default Currency</p>
                <p className="font-medium text-gray-900 dark:text-white">{influencer.defaultCurrency}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referral Code</p>
                <p className="font-medium text-gray-900 dark:text-white font-mono">{influencer.referralCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details Form */}
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Details</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Set up your bank details for withdrawals</p>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Success Message */}
            {saveSuccess && (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 flex items-center gap-3">
                <FaCheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-600 dark:text-green-400">Bank details saved successfully!</p>
              </div>
            )}

            {/* Error Message */}
            {saveError && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              </div>
            )}

            {/* IDR Bank Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🇮🇩</span>
                <h4 className="font-semibold text-gray-900 dark:text-white">Indonesian Rupiah (IDR)</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankNameIdr}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankNameIdr: e.target.value }))}
                    placeholder="e.g., BCA, Mandiri, BRI"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumberIdr}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumberIdr: e.target.value }))}
                    placeholder="1234567890"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountHolderIdr}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountHolderIdr: e.target.value }))}
                    placeholder="Full name as in bank"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* AUD Bank Details */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🇦🇺</span>
                <h4 className="font-semibold text-gray-900 dark:text-white">Australian Dollar (AUD)</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankNameAud}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankNameAud: e.target.value }))}
                    placeholder="e.g., Commonwealth, ANZ"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    BSB
                  </label>
                  <input
                    type="text"
                    value={formData.bsbAud}
                    onChange={(e) => setFormData(prev => ({ ...prev, bsbAud: e.target.value }))}
                    placeholder="123-456"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumberAud}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountNumberAud: e.target.value }))}
                    placeholder="1234567890"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountHolderAud}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccountHolderAud: e.target.value }))}
                    placeholder="Full name as in bank"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="animate-spin h-5 w-5" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}
