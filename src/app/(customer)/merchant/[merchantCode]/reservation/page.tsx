import { redirect } from 'next/navigation';
import { customerOrderUrl } from '@/lib/utils/customerRoutes';

interface ReservationPageProps {
  params: Promise<{ merchantCode: string }>;
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const { merchantCode } = await params;

  // Unified reservation ordering flow uses the same Order UI.
  // Keep this route for backwards-compatibility.
  redirect(customerOrderUrl(merchantCode, { mode: 'dinein', flow: 'reservation' }));
}
