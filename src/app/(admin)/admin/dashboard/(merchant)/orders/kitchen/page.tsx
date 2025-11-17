/**
 * Kitchen Display Page
 * 
 * Full-screen view for kitchen staff
 * Shows only ACCEPTED & IN_PROGRESS orders with large text
 */

'use client';

import React from 'react';
import { KitchenBoard } from '@/components/orders/KitchenBoard';

export default function KitchenDisplayPage() {
  // Mock merchantId - in production, get from auth context
  const merchantId = BigInt(1);

  return (
    <KitchenBoard
      merchantId={merchantId}
      autoRefresh={true}
      refreshInterval={5000} // 5 seconds - faster refresh for kitchen
    />
  );
}
