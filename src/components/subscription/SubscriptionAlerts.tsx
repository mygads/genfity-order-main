'use client';

/**
 * Subscription Alerts Component
 * 
 * Wrapper component that displays:
 * - SuspendedAlert fixed at top for suspended merchants (full width warning, not scrollable)
 * - TrialBanner at bottom-right for active trial merchants
 * - UpgradePromptModal when trial is ending soon (7 days or less)
 * - Grace period warnings before full suspension
 * 
 * Shows for MERCHANT_OWNER and MERCHANT_STAFF roles.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import TrialBanner from '@/components/subscription/TrialBanner';
import SuspendedAlert from '@/components/subscription/SuspendedAlert';
import UpgradePromptModal from '@/components/subscription/UpgradePromptModal';

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
        status: string;
        daysRemaining: number | null;
        suspendReason: string | null;
        graceDaysRemaining?: number | null;
        inGracePeriod?: boolean;
    };
}

/**
 * SubscriptionAlerts
 * 
 * Displays subscription alerts based on merchant's subscription status:
 * - For MERCHANT_OWNER: Fixed banner at top when suspended, upgrade modal when trial ending
 * - For MERCHANT_STAFF: Same fixed banner at top when suspended
 */
export default function SubscriptionAlerts() {
    const { user } = useAuth();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [modalDismissed, setModalDismissed] = useState(false);

    // Show for merchant owners and staff
    const isMerchantOwner = user?.role === 'MERCHANT_OWNER';
    const isMerchantStaff = user?.role === 'MERCHANT_STAFF';
    const shouldFetch = isMerchantOwner || isMerchantStaff;

    const { data, isLoading, error } = useSWRWithAuth<{ success: boolean; data: SubscriptionData }>(
        shouldFetch ? '/api/merchant/subscription' : null,
        {
            revalidateOnFocus: false,
            refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        }
    );

    // Check if upgrade modal was dismissed
    useEffect(() => {
        const dismissed = localStorage.getItem('upgrade-prompt-dismissed');
        if (dismissed) {
            setModalDismissed(true);
        }
    }, []);

    // Show upgrade modal when trial is ending (only for owners)
    useEffect(() => {
        if (!data?.success || !isMerchantOwner || modalDismissed) return;

        const { subscription } = data.data;
        
        // Show modal if on trial with 7 days or less remaining
        if (
            subscription.type === 'TRIAL' && 
            subscription.status === 'ACTIVE' &&
            subscription.daysRemaining !== null && 
            subscription.daysRemaining <= 7 &&
            subscription.daysRemaining > 0
        ) {
            // Check if modal was shown this session
            const shownThisSession = sessionStorage.getItem('upgrade-modal-shown');
            if (!shownThisSession) {
                setShowUpgradeModal(true);
                sessionStorage.setItem('upgrade-modal-shown', 'true');
            }
        }
    }, [data, isMerchantOwner, modalDismissed]);

    // Don't show anything while loading or for non-merchants
    if (!shouldFetch || isLoading) {
        return null;
    }

    // Handle error or no data
    if (error || !data?.success) {
        return null;
    }

    const { subscription } = data.data;

    // Show SuspendedAlert if suspended or no subscription
    // But first check if in grace period
    if (subscription.status === 'SUSPENDED' || subscription.type === 'NONE') {
        return (
            <>
                <SuspendedAlert
                    type={subscription.type === 'NONE' ? 'MONTHLY' : subscription.type}
                    reason={subscription.suspendReason || (subscription.type === 'NONE' ? 'No active subscription' : undefined)}
                    graceDaysRemaining={subscription.graceDaysRemaining ?? undefined}
                />
                {showUpgradeModal && subscription.daysRemaining !== null && isMerchantOwner && (
                    <UpgradePromptModal
                        daysRemaining={subscription.daysRemaining}
                        onClose={() => setShowUpgradeModal(false)}
                        onDontShowAgain={() => setModalDismissed(true)}
                    />
                )}
            </>
        );
    }

    // Show grace period warning if in grace period
    if (subscription.inGracePeriod && subscription.graceDaysRemaining != null && subscription.graceDaysRemaining > 0) {
        return (
            <SuspendedAlert
                type={subscription.type}
                graceDaysRemaining={subscription.graceDaysRemaining ?? undefined}
            />
        );
    }

    // Show TrialBanner and possibly UpgradeModal if on active trial
    if (subscription.type === 'TRIAL' && subscription.daysRemaining !== null && subscription.daysRemaining > 0) {
        return (
            <>
                <TrialBanner daysRemaining={subscription.daysRemaining} />
                {showUpgradeModal && isMerchantOwner && (
                    <UpgradePromptModal
                        daysRemaining={subscription.daysRemaining}
                        onClose={() => setShowUpgradeModal(false)}
                        onDontShowAgain={() => setModalDismissed(true)}
                    />
                )}
            </>
        );
    }

    return null;
}
