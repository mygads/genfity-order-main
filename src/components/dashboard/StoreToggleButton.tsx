'use client';

import { useState, useEffect } from 'react';

interface StoreToggleButtonProps {
  initialIsOpen: boolean;
  merchantId: string;
}

/**
 * Store Open/Close Toggle Button
 * Client component for quick access to toggle store status
 */
export default function StoreToggleButton({ initialIsOpen, merchantId: _merchantId }: StoreToggleButtonProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [isToggling, setIsToggling] = useState(false);

  // Listen for merchant status updates from other components
  useEffect(() => {
    const handleStatusUpdate = () => {
      // Refresh status from API
      fetchMerchantStatus();
    };

    window.addEventListener('merchantStatusUpdated', handleStatusUpdate);
    return () => window.removeEventListener('merchantStatusUpdated', handleStatusUpdate);
  }, []);

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
        setIsOpen(merchantData.isOpen ?? true);
      }
    } catch (error) {
      console.error('Failed to fetch merchant status:', error);
    }
  };

  const toggleStoreOpen = async () => {
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
          isOpen: !isOpen,
        }),
      });

      if (response.ok) {
        setIsOpen(!isOpen);
        // Notify other components
        window.dispatchEvent(new Event('merchantStatusUpdated'));
      }
    } catch (error) {
      console.error('Failed to toggle store open status:', error);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      onClick={toggleStoreOpen}
      disabled={isToggling}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all ${
        isOpen
          ? 'bg-orange-500 hover:bg-orange-600'
          : 'bg-green-500 hover:bg-green-600'
      } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md`}
    >
      {isToggling ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : isOpen ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Close Store
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Open Store
        </>
      )}
    </button>
  );
}
