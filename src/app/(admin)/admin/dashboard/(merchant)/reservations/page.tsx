'use client';

import MerchantReservationsPanel from '@/components/reservations/MerchantReservationsPanel';

export default function MerchantReservationsPage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="reservations-page">
      <MerchantReservationsPanel embedded />
    </div>
  );
}
