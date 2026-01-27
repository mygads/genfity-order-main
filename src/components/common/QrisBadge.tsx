'use client';

import React from 'react';
import { FaQrcode } from 'react-icons/fa';
import Badge from '@/components/ui/badge/Badge';

export interface QrisBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  showIcon?: boolean;
  icon?: React.ReactNode;
  iconClassName?: string;
}

export default function QrisBadge({
  size = 'sm',
  label = 'QRIS',
  className = '',
  showIcon = false,
  icon,
  iconClassName = 'h-3 w-3',
}: QrisBadgeProps) {
  const renderedIcon = icon ?? <FaQrcode className={iconClassName} />;

  return (
    <Badge
      size={size}
      variant="info"
      className={`inline-flex items-center gap-1.5 uppercase tracking-wide ${className}`.trim()}
    >
      {showIcon ? renderedIcon : null}
      <span>{label}</span>
    </Badge>
  );
}
