'use client';

import React from 'react';
import { FaMoneyBillWave } from 'react-icons/fa';

export interface PaymentEmptyStateProps {
  title: string;
  description: string;
  className?: string;
  icon?: React.ReactNode;
  iconWrapperClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function PaymentEmptyState({
  title,
  description,
  className = '',
  icon,
  iconWrapperClassName = 'mt-0.5 rounded-full bg-orange-100 p-2 text-orange-600',
  titleClassName = 'text-sm font-semibold text-gray-900',
  descriptionClassName = 'mt-1 text-xs text-gray-500',
}: PaymentEmptyStateProps) {
  const renderedIcon = icon ?? <FaMoneyBillWave className="h-4 w-4" />;

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <div className={iconWrapperClassName}>{renderedIcon}</div>
        <div>
          <h2 className={titleClassName}>{title}</h2>
          <p className={descriptionClassName}>{description}</p>
        </div>
      </div>
    </div>
  );
}
