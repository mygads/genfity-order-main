'use client';

import useSWR from 'swr';
import { DashboardSkeleton } from '@/components/common/SkeletonLoaders';
import DeliveryDriverDashboard from '@/components/dashboard/DeliveryDriverDashboard';

export default function DeliveryDashboardPage() {
  const { data, isLoading } = useSWR('/api/admin/dashboard');

  if (isLoading || !data?.success) {
    return <DashboardSkeleton />;
  }

  if (data.data?.role !== 'DELIVERY') {
    return <DashboardSkeleton />;
  }

  return (
    <DeliveryDriverDashboard
      merchant={data.data.merchant}
      stats={data.data.stats}
      activeDeliveries={data.data.activeDeliveries || []}
    />
  );
}
