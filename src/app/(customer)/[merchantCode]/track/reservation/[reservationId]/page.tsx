export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export default function ReservationTrackPage({
  params,
}: {
  params: { merchantCode: string; reservationId: string };
}) {
  redirect(`/${params.merchantCode}/history`);
}
