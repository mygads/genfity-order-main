import { Suspense } from 'react';

import { FormPageSkeleton } from '@/components/common/SkeletonLoaders';
import CustomerLoginPage from '@/components/customer/pages/CustomerLoginPage';

export default function Page() {
	return (
		<Suspense fallback={<FormPageSkeleton />}>
			<CustomerLoginPage />
		</Suspense>
	);
}
