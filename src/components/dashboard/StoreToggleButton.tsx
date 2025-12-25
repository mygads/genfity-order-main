'use client';

import { useState, useEffect } from 'react';

interface StoreToggleButtonProps {
  initialIsOpen: boolean;
  initialIsManualOverride?: boolean;
  effectivelyOpen: boolean; // Actual store status considering schedule
  merchantId: string;
  onStatusChange?: (isOpen: boolean, isManualOverride: boolean) => void;
}

/**
 * Store Open/Close Toggle Button
 * Client component for quick access to toggle store status
 * 
 * Modes:
 * - Manual Override (isManualOverride=true): Force store open/close regardless of schedule
 * - Auto Mode (isManualOverride=false): Follow opening hours schedule
 * 
 * Button Logic:
 * - When store is effectively CLOSED (by schedule): Show "Open Store (Manual)" to force open
 * - When store is effectively OPEN: Show "Close Store" to force close
 * - When in manual mode: Show "Switch to Auto" to return to schedule
 */
export default function StoreToggleButton({ 
  initialIsOpen, 
  initialIsManualOverride = false,
  effectivelyOpen,
  merchantId: _merchantId, 
  onStatusChange 
}: StoreToggleButtonProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [isManualOverride, setIsManualOverride] = useState(initialIsManualOverride);
  const [storeEffectivelyOpen, setStoreEffectivelyOpen] = useState(effectivelyOpen);
  const [isToggling, setIsToggling] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  useEffect(() => {
    setIsManualOverride(initialIsManualOverride);
  }, [initialIsManualOverride]);

  useEffect(() => {
    setStoreEffectivelyOpen(effectivelyOpen);
  }, [effectivelyOpen]);

  const fetchMerchantStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/merchant/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const merchantData = data.data?.merchant || data.data;
        const newIsOpen = merchantData.isOpen ?? true;
        const newIsManualOverride = merchantData.isManualOverride ?? false;
        setIsOpen(newIsOpen);
        setIsManualOverride(newIsManualOverride);
        onStatusChange?.(newIsOpen, newIsManualOverride);
      }
    } catch (error) {
      console.error('Failed to fetch merchant status:', error);
    }
  };

  // Listen for merchant status updates from other components
  useEffect(() => {
    const handleStatusUpdate = () => {
      fetchMerchantStatus();
    };

    window.addEventListener('merchantStatusUpdated', handleStatusUpdate);
    return () => window.removeEventListener('merchantStatusUpdated', handleStatusUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle to manual open mode
  const openStoreManually = async () => {
    try {
      setIsToggling(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/merchant/toggle-open', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isOpen: true,
          isManualOverride: true,
        }),
      });

      if (response.ok) {
        setIsOpen(true);
        setIsManualOverride(true);
        setStoreEffectivelyOpen(true);
        onStatusChange?.(true, true);
        window.dispatchEvent(new Event('merchantStatusUpdated'));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to open store:', errorData);
      }
    } catch (error) {
      console.error('Failed to open store:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Toggle to manual close mode
  const closeStoreManually = async () => {
    try {
      setIsToggling(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/merchant/toggle-open', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isOpen: false,
          isManualOverride: true,
        }),
      });

      if (response.ok) {
        setIsOpen(false);
        setIsManualOverride(true);
        setStoreEffectivelyOpen(false);
        onStatusChange?.(false, true);
        window.dispatchEvent(new Event('merchantStatusUpdated'));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to close store:', errorData);
      }
    } catch (error) {
      console.error('Failed to close store:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Switch to auto mode (follow schedule)
  const switchToAutoMode = async () => {
    try {
      setIsToggling(true);
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/merchant/toggle-open', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isManualOverride: false,
        }),
      });

      if (response.ok) {
        setIsManualOverride(false);
        setIsOpen(true); // Reset to true, schedule will determine actual status
        onStatusChange?.(true, false);
        window.dispatchEvent(new Event('merchantStatusUpdated'));
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to switch to auto mode:', errorData);
      }
    } catch (error) {
      console.error('Failed to switch to auto mode:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // If in manual override mode, show "Switch to Auto" button
  if (isManualOverride) {
    return (
      <div className="flex items-center gap-2">
        {/* Manual mode indicator */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Manual
        </span>
        
        <button
          onClick={switchToAutoMode}
          disabled={isToggling}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isToggling ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Switch to Auto
            </>
          )}
        </button>
      </div>
    );
  }

  // Auto mode - show button based on EFFECTIVE store status (considering schedule)
  // If store is effectively CLOSED -> show "Open Store" button
  // If store is effectively OPEN -> show "Close Store" button
  return (
    <div className="flex items-center gap-2">
      {storeEffectivelyOpen ? (
        <button
          onClick={closeStoreManually}
          disabled={isToggling}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isToggling ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Close Store
            </>
          )}
        </button>
      ) : (
        <button
          onClick={openStoreManually}
          disabled={isToggling}
          className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          {isToggling ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Open Store (Manual)
            </>
          )}
        </button>
      )}
    </div>
  );
}
