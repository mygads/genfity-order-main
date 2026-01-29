export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { customerHistoryUrl } from '@/lib/utils/customerRoutes';

export default function ReservationSummaryPage({
  params,
}: {
  params: { merchantCode: string };
}) {
  redirect(customerHistoryUrl(params.merchantCode));
}
