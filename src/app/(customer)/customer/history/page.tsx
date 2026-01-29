import { Suspense } from 'react';

import { CustomerHistoryPageSkeleton } from '@/components/customer/skeletons/CustomerHistorySkeleton';
import CustomerHistoryPage from '@/components/customer/pages/CustomerHistoryPage';

export default function Page() {
	return (
		<Suspense fallback={<CustomerHistoryPageSkeleton />}>
			<CustomerHistoryPage />
		</Suspense>
	);
}
