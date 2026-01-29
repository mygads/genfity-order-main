import MerchantEntryClientPage from '@/components/customer/MerchantEntryClientPage';

/**
 * Merchant entry page
 * Route: /merchant
 *
 * Provides merchant code input + QR scan to navigate to /merchant/[merchantCode].
 */
export default function MerchantEntryPage() {
  return <MerchantEntryClientPage />;
}
