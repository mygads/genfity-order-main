'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  FaCheck, 
  FaArrowRight, 
  FaTimes,
  FaStore,
  FaList,
  FaUtensils,
  FaPlusCircle,
  FaClock,
  FaRocket
} from 'react-icons/fa';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  apiEndpoint: string;
  checkField: string;
  minRequired: number;
  priority: number;
}

interface ChecklistStatus {
  [key: string]: boolean;
}

/**
 * Getting Started Checklist Widget
 * Displays a checklist for new merchants to complete their store setup
 */
export function GettingStartedChecklist() {
  const router = useRouter();
  const { t } = useTranslation();
  const [status, setStatus] = useState<ChecklistStatus>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Checklist items configuration (removed QR code task per user request)
  const checklistItems: ChecklistItem[] = [
    {
      id: 'merchant_info',
      title: t('checklist.merchantInfo') || 'Complete Store Info',
      description: t('checklist.merchantInfoDesc') || 'Add your store name, logo, and contact details',
      icon: <FaStore className="w-4 h-4" />,
      route: '/admin/dashboard/merchant/edit',
      apiEndpoint: '/api/merchant/profile',
      checkField: 'hasLogo',
      minRequired: 1,
      priority: 1,
    },
    {
      id: 'categories',
      title: t('checklist.categories') || 'Create Categories',
      description: t('checklist.categoriesDesc') || 'Add at least 1 menu category',
      icon: <FaList className="w-4 h-4" />,
      route: '/admin/dashboard/categories',
      apiEndpoint: '/api/merchant/categories',
      checkField: 'count',
      minRequired: 1,
      priority: 2,
    },
    {
      id: 'menu_items',
      title: t('checklist.menuItems') || 'Add Menu Items',
      description: t('checklist.menuItemsDesc') || 'Add at least 3 items to your menu',
      icon: <FaUtensils className="w-4 h-4" />,
      route: '/admin/dashboard/menu',
      apiEndpoint: '/api/merchant/menu',
      checkField: 'count',
      minRequired: 3,
      priority: 3,
    },
    {
      id: 'addons',
      title: t('checklist.addons') || 'Set Up Addons (Optional)',
      description: t('checklist.addonsDesc') || 'Create addon categories for customizations',
      icon: <FaPlusCircle className="w-4 h-4" />,
      route: '/admin/dashboard/addon-categories',
      apiEndpoint: '/api/merchant/addon-categories',
      checkField: 'count',
      minRequired: 0, // Optional
      priority: 4,
    },
    {
      id: 'opening_hours',
      title: t('checklist.openingHours') || 'Set Opening Hours',
      description: t('checklist.openingHoursDesc') || 'Configure your business hours',
      icon: <FaClock className="w-4 h-4" />,
      route: '/admin/dashboard/merchant/edit',
      apiEndpoint: '/api/merchant/profile', // Opening hours in merchant profile
      checkField: 'hasOpeningHours',
      minRequired: 1,
      priority: 5,
    },
  ];

  // Check completion status of all items
  const checkCompletionStatus = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newStatus: ChecklistStatus = {};
    
    try {
      // Check merchant info (logo, opening hours) from profile
      const merchantRes = await fetch('/api/merchant/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (merchantRes.ok) {
        const merchantData = await merchantRes.json();
        newStatus['merchant_info'] = !!merchantData.data?.logoUrl;
        // Check opening hours from profile
        const openingHours = merchantData.data?.openingHours || [];
        newStatus['opening_hours'] = openingHours.length > 0;
      }

      // Check categories count
      const categoriesRes = await fetch('/api/merchant/categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const count = categoriesData.data?.length || 0;
        newStatus['categories'] = count >= 1;
      }

      // Check menu items count
      const menuRes = await fetch('/api/merchant/menu', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const count = menuData.data?.length || 0;
        newStatus['menu_items'] = count >= 3;
      }

      // Check addons (optional - always considered "done" if user has looked at it)
      const addonsRes = await fetch('/api/merchant/addon-categories', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (addonsRes.ok) {
        const addonsData = await addonsRes.json();
        const count = addonsData.data?.length || 0;
        // Mark as done if they have any, or if dismissed
        newStatus['addons'] = count >= 1 || localStorage.getItem('checklist_addons_skipped') === 'true';
      }

      setStatus(newStatus);
    } catch (error) {
      console.error('Error checking checklist status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if checklist was dismissed or completed
    const isDismissed = localStorage.getItem('genfity_checklist_dismissed') === 'true';
    const isCompleted = localStorage.getItem('genfity_checklist_completed') === 'true';
    setDismissed(isDismissed || isCompleted);
    
    if (!isDismissed && !isCompleted) {
      checkCompletionStatus();
    } else {
      setLoading(false);
    }
  }, [checkCompletionStatus]);

  // Calculate progress
  const requiredItems = checklistItems.filter(item => item.minRequired > 0);
  const completedRequired = requiredItems.filter(item => status[item.id]).length;
  const progressPercent = Math.round((completedRequired / requiredItems.length) * 100);
  const isComplete = progressPercent === 100;

  // Auto-close and save to localStorage when all tasks complete
  useEffect(() => {
    if (isComplete && !loading && !dismissed) {
      // Wait a bit to show the celebration, then auto-dismiss
      const timer = setTimeout(() => {
        localStorage.setItem('genfity_checklist_completed', 'true');
        setDismissed(true);
      }, 3000); // 3 seconds to show completion state
      return () => clearTimeout(timer);
    }
  }, [isComplete, loading, dismissed]);

  // Handle navigation to incomplete item
  const handleItemClick = (item: ChecklistItem) => {
    router.push(item.route);
  };

  // Handle skip optional item
  const handleSkipOptional = (itemId: string) => {
    localStorage.setItem(`checklist_${itemId}_skipped`, 'true');
    setStatus(prev => ({ ...prev, [itemId]: true }));
  };

  // Handle dismiss checklist
  const handleDismiss = () => {
    localStorage.setItem('genfity_checklist_dismissed', 'true');
    setDismissed(true);
  };

  // Handle reset checklist
  const handleReset = () => {
    localStorage.removeItem('genfity_checklist_dismissed');
    localStorage.removeItem('genfity_checklist_completed');
    localStorage.removeItem('checklist_addons_skipped');
    setDismissed(false);
    setLoading(true);
    checkCompletionStatus();
  };

  // Don't render if dismissed - Compact
  if (dismissed) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('checklist.dismissed') || 'Setup checklist dismissed'}
          </p>
          <button
            onClick={handleReset}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium touch-manipulation"
          >
            {t('checklist.showAgain') || 'Show checklist'}
          </button>
        </div>
      </div>
    );
  }

  // Loading state - Compact
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  // Complete state - Compact celebration
  if (isComplete) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center">
              <FaCheck className="w-3 h-3 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('checklist.complete') || '🎉 Setup Complete!'}
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-green-600 hover:bg-green-200 dark:hover:bg-green-800 rounded transition-colors touch-manipulation"
            title="Dismiss"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      data-tutorial="getting-started-checklist"
    >
      {/* Compact Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-900/10 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
            <FaRocket className="w-3 h-3 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
              {t('checklist.title') || 'Getting Started'}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedRequired}/{requiredItems.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Dismiss"
          >
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Compact Checklist Items */}
      {expanded && (
        <div className="p-2 space-y-1">
          {checklistItems.map((item) => {
            const isCompleted = status[item.id];
            const isOptional = item.minRequired === 0;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all touch-manipulation ${
                  isCompleted
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                }`}
                onClick={() => !isCompleted && handleItemClick(item)}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isCompleted ? <FaCheck className="w-2.5 h-2.5" /> : <span className="text-[10px]">{item.priority}</span>}
                </div>

                <span
                  className={`flex-1 text-xs ${
                    isCompleted
                      ? 'text-green-700 dark:text-green-300 line-through'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.title}
                  {isOptional && !isCompleted && (
                    <span className="ml-1 text-[10px] text-gray-400">(optional)</span>
                  )}
                </span>

                {!isCompleted && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isOptional && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSkipOptional(item.id);
                        }}
                        className="text-[10px] text-gray-400 hover:text-gray-600 px-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 touch-manipulation"
                      >
                        Skip
                      </button>
                    )}
                    <FaArrowRight className="w-2.5 h-2.5 text-brand-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GettingStartedChecklist;
