export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export default function ReservationSummaryPage({
  params,
}: {
  params: { merchantCode: string };
}) {
  redirect(`/${params.merchantCode}/history`);
}
