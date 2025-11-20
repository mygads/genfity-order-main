/**
 * Kitchen Display Page
 * 
 * Full-screen view for kitchen staff
 * Shows only ACCEPTED & IN_PROGRESS orders with large text
 * 
 * Features:
 * - Progressive Display Mode (single button):
 *   1. Normal → Click → Clean Mode (hide breadcrumb, navbar, sidebar)
 *   2. Clean Mode → Click → Full Screen (browser fullscreen)
 *   3. Full Screen → Click → Normal (exit and show all UI)
 * 
 * - ESC key exits fullscreen and returns to Clean Mode
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FaExpand, FaCompress, FaEye } from 'react-icons/fa';
import { KitchenBoard } from '@/components/orders/KitchenBoard';

export default function KitchenDisplayPage() {
  // Mock merchantId - in production, get from auth context
  const merchantId = BigInt(1);
  
  const [displayMode, setDisplayMode] = useState<'normal' | 'clean' | 'fullscreen'>('normal');

  // Handle display mode changes
  useEffect(() => {
    const sidebar = document.querySelector('[data-sidebar]') as HTMLElement;
    const header = document.querySelector('[data-header]') as HTMLElement;
    const breadcrumb = document.querySelector('[data-breadcrumb]') as HTMLElement;

    if (displayMode === 'clean' || displayMode === 'fullscreen') {
      // Hide UI elements
      document.body.classList.add('clean-mode');
      if (sidebar) sidebar.style.display = 'none';
      if (header) header.style.display = 'none';
      if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
      // Show UI elements
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('clean-mode');
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (breadcrumb) breadcrumb.style.display = '';
    };
  }, [displayMode]);

  // Listen to fullscreen changes (ESC key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && displayMode === 'fullscreen') {
        // User pressed ESC, go back to clean mode
        setDisplayMode('clean');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [displayMode]);

  return (
    <div className={`relative ${displayMode !== 'normal' ? 'fixed inset-0 z-50 overflow-auto bg-white dark:bg-gray-950' : ''}`}>
      {/* Progressive Display Mode Button - Always visible */}
      <div className="fixed top-4 right-4 z-60">
        <button
          onClick={async () => {
            if (displayMode === 'normal') {
              // Go to clean mode
              setDisplayMode('clean');
            } else if (displayMode === 'clean') {
              // Go to fullscreen mode
              try {
                await document.documentElement.requestFullscreen();
                setDisplayMode('fullscreen');
              } catch (err) {
                console.error('Error entering fullscreen:', err);
              }
            } else {
              // Exit fullscreen, back to normal
              try {
                if (document.fullscreenElement) {
                  await document.exitFullscreen();
                }
                setDisplayMode('normal');
              } catch (err) {
                console.error('Error exiting fullscreen:', err);
              }
            }
          }}
          className={`flex h-12 w-12 items-center justify-center rounded-lg border shadow-lg transition-all ${
            displayMode !== 'normal'
              ? 'border-brand-500 bg-brand-500 text-white hover:bg-brand-600'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
          title={
            displayMode === 'normal' ? 'Enter Clean Mode' :
            displayMode === 'clean' ? 'Enter Full Screen' :
            'Exit Full Screen'
          }
        >
          {displayMode === 'normal' ? <FaEye className="h-5 w-5" /> :
           displayMode === 'clean' ? <FaExpand className="h-5 w-5" /> :
           <FaCompress className="h-5 w-5" />}
        </button>
      </div>

      {/* Kitchen Board */}
      <KitchenBoard
        merchantId={merchantId}
        autoRefresh={true}
        refreshInterval={5000} // 5 seconds - faster refresh for kitchen
      />
    </div>
  );
}
