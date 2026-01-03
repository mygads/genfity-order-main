/**
 * useSubscriptionStatus Hook
 * 
 * Hook to get the current merchant's subscription status.
 * Used to determine if merchant can access certain features.
 * Only fetches for merchant users (MERCHANT_OWNER, MERCHANT_STAFF).
 */

'use client';

import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionData {
    subscription: {
        type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
        status: string;
        isValid: boolean;
        daysRemaining: number | null;
        suspendReason: string | null;
    };
}

interface UseSubscriptionStatusResult {
    isLoading: boolean;
    error: Error | null;
    isActive: boolean;
    isSuspended: boolean;
    hasNoSubscription: boolean;
    subscriptionType: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE' | null;
    daysRemaining: number | null;
    suspendReason: string | null;
    refresh: () => void;
}

/**
 * Hook to check merchant subscription status
 * 
 * @returns Subscription status and helpers
 * 
 * @example
 * const { isActive, isSuspended, isLoading } = useSubscriptionStatus();
 * 
 * if (isSuspended) {
 *   // Show subscription required message
 * }
 */
export function useSubscriptionStatus(): UseSubscriptionStatusResult {
    const { user } = useAuth();
    
    // Only fetch for merchant users (MERCHANT_OWNER or MERCHANT_STAFF)
    const isMerchantUser = user?.role === 'MERCHANT_OWNER' || user?.role === 'MERCHANT_STAFF';
    
    const { data, error, isLoading, mutate } = useSWRWithAuth<{ success: boolean; data: SubscriptionData }>(
        // Only fetch if user is a merchant user, otherwise pass null to disable fetching
        isMerchantUser ? '/api/merchant/subscription' : null,
        {
            revalidateOnFocus: false,
            refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
        }
    );

    // For non-merchant users (super admin, customer), return default values without errors
    if (!isMerchantUser) {
        return {
            isLoading: false,
            error: null,
            isActive: true, // Treat as active for super admins
            isSuspended: false,
            hasNoSubscription: false,
            subscriptionType: null,
            daysRemaining: null,
            suspendReason: null,
            refresh: () => {},
        };
    }

    // Default values when loading or error
    if (isLoading || error || !data?.success) {
        return {
            isLoading,
            error: error || null,
            isActive: false,
            isSuspended: !isLoading, // Treat as suspended if not loading and has error
            hasNoSubscription: false,
            subscriptionType: null,
            daysRemaining: null,
            suspendReason: null,
            refresh: () => mutate(),
        };
    }

    const { subscription } = data.data;

    const isActive = subscription.status === 'ACTIVE' && subscription.type !== 'NONE';
    const isSuspended = subscription.status === 'SUSPENDED' || subscription.type === 'NONE';
    const hasNoSubscription = subscription.type === 'NONE';

    return {
        isLoading,
        error: null,
        isActive,
        isSuspended,
        hasNoSubscription,
        subscriptionType: subscription.type,
        daysRemaining: subscription.daysRemaining,
        suspendReason: subscription.suspendReason,
        refresh: () => mutate(),
    };
}

export default useSubscriptionStatus;
