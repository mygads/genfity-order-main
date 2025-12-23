/**
 * Profile Page
 * Route: /admin/dashboard/profile
 * Access: All authenticated admin users
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useToast } from '@/hooks/useToast';
import Image from 'next/image';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profilePictureUrl?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');



  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/profile/get', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.data);
        setName(data.data.name);
        setEmail(data.data.email);
        setPhone(data.data.phone || '');
      } else {
        error('Error', 'Failed to load profile');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      error('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (newPassword && newPassword !== confirmPassword) {
      error('Validation Error', 'New passwords do not match');
      return;
    }

    setUpdating(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          phone: phone || null,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setProfile(data.data);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        success('Success', 'Profile updated successfully');
      } else {
        error('Error', data.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      error('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      error('Invalid File', 'Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('File Too Large', 'File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getAdminToken();
      const response = await fetch('/api/admin/profile/upload-picture', {
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

        // Save to localStorage and dispatch event for navbar update
        localStorage.setItem('profilePictureUrl', data.data.url);
        window.dispatchEvent(new Event('profilePictureUpdated'));

        success('Success', 'Profile picture uploaded successfully');
      } else {
        error('Error', data.message || 'Failed to upload picture');
      }
    } catch (err) {
      console.error('Error uploading picture:', err);
      error('Error', 'Failed to upload picture');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Profile not found</p>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Profile" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Picture Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Profile Picture
          </h3>

          <div className="flex flex-col items-center">
            <div className="relative mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-gray-200 dark:border-gray-700">
              {profile.profilePictureUrl ? (
                <Image
                  src={profile.profilePictureUrl}
                  alt={profile.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-100 text-4xl font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Change Picture
                </>
              )}
            </button>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Max 5MB • JPEG, PNG, WebP
            </p>
          </div>

          {/* Profile Info */}
          <div className="mt-6 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {profile.role.replace('_', ' ')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${profile.isActive
                ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${profile.isActive ? 'bg-success-500' : 'bg-gray-500'
                  }`}></span>
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-6 text-lg font-semibold text-gray-800 dark:text-white/90">
              Profile Information
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                  Change Password
                </h4>

                {/* Current Password */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Leave blank to keep current password"
                  />
                </div>

                {/* New Password */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={fetchProfile}
                  className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Updating...
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
    </div>
  );
}
