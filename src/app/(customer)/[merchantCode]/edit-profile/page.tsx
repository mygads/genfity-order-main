'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { getCustomerAuth, saveCustomerAuth } from '@/lib/utils/localStorage';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';

/**
 * Edit Profile Page - Burjo ESB Style
 * 
 * Form fields:
 * - Name (editable)
 * - Phone/WhatsApp (read-only, disabled)
 * - Email (editable)
 * - Save button at bottom
 */

function EditProfileContent() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const [auth, setAuth] = useState(getCustomerAuth());
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const merchantCode = params.merchantCode as string;
    const mode = searchParams.get('mode') || 'dinein';
    const ref = searchParams.get('ref') || `/${merchantCode}/profile?mode=${mode}`;

    // Load user data on mount
    useEffect(() => {
        if (!auth) {
            router.push(`/login?ref=${encodeURIComponent(`/${merchantCode}/profile?mode=${mode}`)}`);
            return;
        }

        setName(auth.user.name || '');
        setPhone(auth.user.phone || '');
        setEmail(auth.user.email || '');
    }, [auth, router, merchantCode, mode]);

    const handleBack = () => {
        if (ref) {
            router.push(decodeURIComponent(ref));
        } else {
            router.back();
        }
    };

    const handleSave = async () => {
        if (!auth) return;

        // Validation
        if (!name.trim()) {
            setError('Name is required');
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
                // Update local auth state with new name/email
                const updatedAuth = {
                    ...auth,
                    user: {
                        ...auth.user,
                        name: name.trim(),
                        email: email.trim() || auth.user.email,
                    },
                };
                saveCustomerAuth(updatedAuth);
                setAuth(updatedAuth);
                setSuccess(true);

                // Redirect back after success
                setTimeout(() => {
                    handleBack();
                }, 1000);
            } else {
                setError(data.message || 'Failed to update profile');
            }
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!auth) {
        return <LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />;
    }

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
                        Edit Profile
                    </h1>
                </div>
            </header>

            {/* Form Content */}
            <div className="flex-1 px-4 py-6">
                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-400">Profile updated successfully!</p>
                    </div>
                )}

                {/* Name Field */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-base focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Your name"
                    />
                </div>

                {/* Phone Field (Read-only) */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                        WhatsApp Number
                    </label>
                    <input
                        type="text"
                        value={phone}
                        disabled
                        className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-base cursor-not-allowed"
                        placeholder="Phone number"
                    />
                </div>

                {/* Email Field */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-base focus:outline-none focus:border-orange-500 transition-colors"
                        placeholder="Your email"
                    />
                </div>
            </div>

            {/* Fixed Bottom Save Button */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-base font-semibold rounded-lg transition-colors flex items-center justify-center"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        'Save'
                    )}
                </button>
            </div>
        </div>
    );
}

/**
 * Edit Profile Page with Suspense wrapper
 */
export default function EditProfilePage() {
    return (
        <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.PROFILE} />}>
            <EditProfileContent />
        </Suspense>
    );
}
