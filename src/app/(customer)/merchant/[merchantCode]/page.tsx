import { notFound, redirect } from 'next/navigation';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import MerchantClientPage from '../../../../components/customer/MerchantClientPage';

// ISR: Revalidate every 1 hour (3600 seconds)
export const revalidate = 3600;

interface MerchantPageProps {
  params: Promise<{
    merchantCode: string;
  }>;
}

interface MerchantData {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  phone?: string;
  country?: string | null;
  currency?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  // Ordering modes
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  isDeliveryEnabled?: boolean;
  // Scheduled orders
  isScheduledOrderEnabled?: boolean;
  // Reservations
  isReservationEnabled?: boolean;
  reservationMenuRequired?: boolean;
  reservationMinItemCount?: number;
  timezone?: string;
  // Needed to decide if delivery can run
  latitude?: string | number | null;
  longitude?: string | number | null;
  openingHours: {
    id: string;
    dayOfWeek: number;
    isClosed: boolean;
    is24Hours?: boolean;
    openTime?: string;
    closeTime?: string;
  }[];
}

/**
 * Fetch merchant data on server-side for ISR
 */
async function getMerchant(merchantCode: string): Promise<MerchantData | null> {
  try {
    const response = await fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}`), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Failed to fetch merchant:', error);
    return null;
  }
}

/**
 * GENFITY - Order Mode Selection Page (Server Component)
 * 
 * ISR Strategy:
 * - Revalidate every 1 hour (3600 seconds)
 * - Initial data fetched server-side
 * - Client component handles mode selection and store closed UI
 */
export default async function MerchantModePage({ params }: MerchantPageProps) {
  const { merchantCode } = await params;

  const normalizedMerchantCode = merchantCode.toUpperCase();
  if (merchantCode !== normalizedMerchantCode) {
    redirect(`/merchant/${normalizedMerchantCode}`);
  }

  // Fetch merchant data server-side
  const merchant = await getMerchant(normalizedMerchantCode);

  // Handle merchant not found
  if (!merchant) {
    notFound();
  }

  return (
    <MerchantClientPage
      merchant={merchant}
      merchantCode={normalizedMerchantCode}
    />
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: MerchantPageProps) {
  const { merchantCode } = await params;
  const merchant = await getMerchant(merchantCode.toUpperCase());

  if (!merchant) {
    return {
      title: 'Merchant Not Found',
    };
  }

  return {
    title: `${merchant.name} - Genfity Order`,
    description: merchant.description || `Order food from ${merchant.name}`,
  };
}
