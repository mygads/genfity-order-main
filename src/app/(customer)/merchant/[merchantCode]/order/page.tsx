import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CustomerOrderSkeleton } from '@/components/common/SkeletonLoaders';
import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';
import OrderClientPage from '../../../../../components/customer/OrderClientPage';

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

interface OrderPageProps {
  params: Promise<{
    merchantCode: string;
  }>;
  searchParams: Promise<{
    mode?: string;
    flow?: string;
    scheduled?: string;
  }>;
}

interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isActive: boolean;
  currency: string;
  enableTax: boolean;
  taxPercentage: number;
  requireTableNumberForDineIn?: boolean;
  openingHours: Array<{
    id: string;
    merchantId: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  categoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  isActive: boolean;
  trackStock: boolean;
  isPromo?: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  promoPrice?: number;
}

interface InitialData {
  merchant: MerchantInfo | null;
  categories: Category[];
  menus: MenuItem[];
}

/**
 * Fetch initial data server-side for ISR
 */
async function getInitialData(merchantCode: string): Promise<InitialData> {
  try {
    const [merchantRes, categoriesRes, menusRes] = await Promise.all([
      fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}`), {
        next: { revalidate: 60 },
      }),
      fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}/categories`), {
        next: { revalidate: 60 },
      }),
      fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}/menus`), {
        next: { revalidate: 60 },
      }),
    ]);

    const [merchantData, categoriesData, menusData] = await Promise.all([
      merchantRes.json(),
      categoriesRes.json(),
      menusRes.json(),
    ]);

    return {
      merchant: merchantData.success ? merchantData.data : null,
      categories: categoriesData.success
        ? categoriesData.data.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder)
        : [],
      menus: menusData.success
        ? menusData.data
          .filter((item: MenuItem) => item.isActive)
          .map((item: MenuItem) => ({
            ...item,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
          }))
        : [],
    };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    return {
      merchant: null,
      categories: [],
      menus: [],
    };
  }
}

/**
 * GENFITY - Order Page (Server Component with ISR)
 * 
 * ISR + Client Polling Hybrid Strategy:
 * - Server fetches initial data every 60 seconds (ISR)
 * - Client polls for updates every 15 seconds
 * - Best of both worlds: fast initial load + real-time updates
 */
export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { merchantCode } = await params;
  const { mode = 'takeaway', flow, scheduled } = await searchParams;

  // Fetch initial data server-side (ISR cached)
  const initialData = await getInitialData(merchantCode);

  // If merchant doesn't exist, show 404 page
  if (!initialData.merchant) {
    notFound();
  }

  return (
    <Suspense fallback={<CustomerOrderSkeleton />}>
      <OrderClientPage
        merchantCode={merchantCode}
        mode={mode}
        flow={flow}
        scheduled={scheduled}
        initialMerchant={initialData.merchant}
        initialCategories={initialData.categories}
        initialMenus={initialData.menus}
      />
    </Suspense>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: OrderPageProps) {
  const { merchantCode } = await params;
  try {
    const res = await fetch(buildOrderApiUrl(`/api/public/merchants/${merchantCode}`));
    const data = await res.json();

    if (data.success) {
      return {
        title: `Menu - ${data.data.name} | Genfity Order`,
        description: `Browse and order food from ${data.data.name}`,
      };
    }
  } catch {
    // Fallback
  }

  return {
    title: 'Order Menu | Genfity',
    description: 'Browse and order your favorite food',
  };
}
