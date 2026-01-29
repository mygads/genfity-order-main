export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { customerHistoryUrl } from '@/lib/utils/customerRoutes';

export default function ReservationTrackPage({
  params,
}: {
  params: { merchantCode: string; reservationId: string };
}) {
  redirect(customerHistoryUrl(params.merchantCode));
}
