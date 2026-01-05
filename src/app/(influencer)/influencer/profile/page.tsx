'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useInfluencer } from '../layout';
import InfluencerHeader from '@/layout/InfluencerHeader';
import { InfluencerProfileSkeleton } from '@/components/common/SkeletonLoaders';
import {
  FaCamera,
  FaCheckCircle,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaGlobe,
  FaCalendar,
} from 'react-icons/fa';

interface InfluencerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  country: string;
  defaultCurrency: string;
  profilePictureUrl?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
}

export default function InfluencerProfilePage() {
  const router = useRouter();
  const { setIsSidebarOpen } = useInfluencer();
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfile = useCallback(async () => {
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
      if (response.ok && data.success) {
        setProfile(data.data);
        setName(data.data.name);
        setPhone(data.data.phone || '');
      } else {
        setError(data.message || 'Failed to load profile');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);
    setIsSaving(true);

    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    try {
      const response = await fetch('/api/influencer/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.data);
        setSaveSuccess(true);
        
        // Update localStorage for header
        const storedData = localStorage.getItem('influencerData');
        if (storedData) {
          const influencerData = JSON.parse(storedData);
          influencerData.name = data.data.name;
          influencerData.profilePictureUrl = data.data.profilePictureUrl;
          localStorage.setItem('influencerData', JSON.stringify(influencerData));
          window.dispatchEvent(new Event('influencerProfileUpdated'));
        }
        
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.message || 'Failed to update profile');
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveError('Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setSaveError('');

    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/influencer/profile/upload-picture', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update profile with new picture URL
        if (profile) {
          setProfile({
            ...profile,
            profilePictureUrl: data.data.url,
          });
        }

        // Update localStorage for header
        const storedData = localStorage.getItem('influencerData');
        if (storedData) {
          const influencerData = JSON.parse(storedData);
          influencerData.profilePictureUrl = data.data.url;
          localStorage.setItem('influencerData', JSON.stringify(influencerData));
          window.dispatchEvent(new Event('influencerProfileUpdated'));
        }

        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.message || 'Failed to upload picture');
      }
    } catch {
      setSaveError('Failed to upload picture');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (isLoading) {
    return (
      <>
        <InfluencerHeader title="Profile" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <InfluencerProfileSkeleton />
        </main>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <InfluencerHeader title="Profile" onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="p-4 lg:p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error || 'Profile not found'}</p>
              <button
                onClick={fetchProfile}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
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
      <InfluencerHeader title="Profile" onMenuClick={() => setIsSidebarOpen(true)} />

      <main className="p-4 lg:p-6">
        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 flex items-center gap-3">
            <FaCheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>
          </div>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Picture Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Profile Picture
            </h3>

            <div className="flex flex-col items-center">
              {/* Profile Picture */}
              <div className="relative mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-orange-100 dark:border-orange-900/30 overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {profile.profilePictureUrl ? (
                    <Image
                      src={profile.profilePictureUrl}
                      alt={profile.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                      <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <FaSpinner className="w-4 h-4 animate-spin" />
                  ) : (
                    <FaCamera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Max 5MB • JPEG, PNG, WebP
              </p>

              {/* Profile Info */}
              <div className="w-full mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FaEnvelope className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FaGlobe className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Country</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile.country} ({profile.defaultCurrency})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <FaCalendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(profile.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex gap-2 pt-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    profile.isApproved
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      profile.isApproved ? 'bg-green-500' : 'bg-yellow-500'
                    }`}></span>
                    {profile.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                    profile.isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      profile.isActive ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></span>
                    {profile.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Profile Information
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FaUser className="inline w-4 h-4 mr-1" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FaEnvelope className="inline w-4 h-4 mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FaPhone className="inline w-4 h-4 mr-1" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Referral Code (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Referral Code
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={profile.referralCode}
                      disabled
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(profile.referralCode);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 2000);
                      }}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Share this code with merchants to earn commissions
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setName(profile.name);
                      setPhone(profile.phone || '');
                    }}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
