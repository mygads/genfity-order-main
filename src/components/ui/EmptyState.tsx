"use client";

import React from 'react';

export type EmptyStateType = 
  | 'no-data'
  | 'no-results'
  | 'no-menu'
  | 'no-category'
  | 'no-addon'
  | 'no-order'
  | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  illustration?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  type = 'no-data',
  title,
  description,
  action,
  illustration,
  className = '',
}: EmptyStateProps) {
  const config = getEmptyStateConfig(type);

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      {/* Illustration */}
      <div className="mb-6">
        {illustration || config.illustration}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-800">
        {title || config.title}
      </h3>

      {/* Description */}
      <p className="mt-2 max-w-md text-center text-sm text-gray-600">
        {description || config.description}
      </p>

      {/* Action Button */}
      {(action || config.action) && (
        <button
          onClick={action?.onClick || config.action?.onClick}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
        >
          {action?.icon || config.action?.icon}
          {action?.label || config.action?.label}
        </button>
      )}
    </div>
  );
}

function getEmptyStateConfig(type: EmptyStateType) {
  const configs: Record<EmptyStateType, {
    title: string;
    description: string;
    illustration: React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
      icon?: React.ReactNode;
    };
  }> = {
    'no-data': {
      title: 'No Data Available',
      description: 'There is no data to display at the moment. Start by creating your first item.',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
    },
    'no-results': {
      title: 'No Results Found',
      description: 'We couldn\'t find any items matching your search criteria. Try adjusting your filters or search terms.',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    'no-menu': {
      title: 'No Menu Items Yet',
      description: 'Start building your menu by adding your first delicious item. Your customers are waiting!',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: {
        label: 'Add Your First Menu Item',
        onClick: () => {},
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    },
    'no-category': {
      title: 'No Categories Created',
      description: 'Categories help organize your menu. Create categories like Drinks, Mains, Desserts to get started.',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      action: {
        label: 'Create First Category',
        onClick: () => {},
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    },
    'no-addon': {
      title: 'No Addon Categories',
      description: 'Boost sales with add-ons! Create categories for extras like Size, Toppings, or Side Dishes.',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      action: {
        label: 'Create Addon Category',
        onClick: () => {},
        icon: (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      },
    },
    'no-order': {
      title: 'No Orders Yet',
      description: 'Orders will appear here once customers start placing them. Share your menu to get started!',
      illustration: (
        <svg className="h-32 w-32 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
    },
    'error': {
      title: 'Something Went Wrong',
      description: 'We encountered an error while loading the data. Please try again or contact support if the problem persists.',
      illustration: (
        <svg className="h-32 w-32 text-error-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  return configs[type];
}

// Individual illustrations as separate components for customization
export function NoMenuIllustration() {
  return (
    <div className="relative">
      <svg className="h-40 w-40 text-gray-200" viewBox="0 0 200 200" fill="currentColor">
        <rect x="40" y="40" width="120" height="120" rx="8" opacity="0.2" />
        <rect x="60" y="60" width="80" height="20" rx="4" opacity="0.3" />
        <rect x="60" y="90" width="60" height="12" rx="3" opacity="0.2" />
        <rect x="60" y="110" width="40" height="12" rx="3" opacity="0.2" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="h-16 w-16 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    </div>
  );
}

export function NoCategoryIllustration() {
  return (
    <div className="relative">
      <svg className="h-40 w-40 text-gray-200" viewBox="0 0 200 200" fill="currentColor">
        <path d="M50 80 L30 100 L50 120 L70 100 Z" opacity="0.2" />
        <path d="M90 80 L70 100 L90 120 L110 100 Z" opacity="0.3" />
        <path d="M130 80 L110 100 L130 120 L150 100 Z" opacity="0.2" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg className="h-16 w-16 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      </div>
    </div>
  );
}
