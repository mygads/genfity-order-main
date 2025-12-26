'use client';

/**
 * Subscription Alerts Component
 * 
 * Wrapper component that displays TrialBanner or SuspendedAlert based on subscription status.
 * Only shows for MERCHANT_OWNER role, not for SUPER_ADMIN or STAFF.
 */

import { useAuth } from '@/hooks/useAuth';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import TrialBanner from '@/components/subscription/TrialBanner';
import SuspendedAlert from '@/components/subscription/SuspendedAlert';

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
        status: string;
        daysRemaining: number | null;
        suspendReason: string | null;
    };
}

/**
 * SubscriptionAlerts
 * 
 * Displays trial countdown or suspended warning based on merchant's subscription status.
 * Only visible to MERCHANT_OWNER users.
 */
export default function SubscriptionAlerts() {
    const { user } = useAuth();

    // Only fetch for merchant owners
    const isMerchantOwner = user?.role === 'MERCHANT_OWNER';

    const { data, isLoading } = useSWRWithAuth<{ success: boolean; data: SubscriptionData }>(
        isMerchantOwner ? '/api/merchant/subscription' : null,
        {
            revalidateOnFocus: false,
            refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        }
    );

    // Don't show anything while loading or for non-merchants
    if (!isMerchantOwner || isLoading || !data?.success) {
        return null;
    }

    const { subscription } = data.data;

    // Show SuspendedAlert if suspended
    if (subscription.status === 'SUSPENDED') {
        return (
            <SuspendedAlert
                type={subscription.type}
                reason={subscription.suspendReason || undefined}
            />
        );
    }

    // Show TrialBanner if on trial with days remaining
    if (subscription.type === 'TRIAL' && subscription.daysRemaining !== null && subscription.daysRemaining > 0) {
        return <TrialBanner daysRemaining={subscription.daysRemaining} />;
    }

    return null;
}
