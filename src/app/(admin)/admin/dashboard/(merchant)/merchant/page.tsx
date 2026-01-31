import { redirect } from 'next/navigation';

export default function MerchantIndexPage() {
  redirect('/admin/dashboard/merchant/view');
}
