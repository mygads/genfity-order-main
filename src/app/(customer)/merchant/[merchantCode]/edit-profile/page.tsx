import { Suspense } from 'react';

import { FormPageSkeleton } from '@/components/common/SkeletonLoaders';
import CustomerEditProfilePage from '@/components/customer/pages/CustomerEditProfilePage';

export default function Page() {
	return (
		<Suspense fallback={<FormPageSkeleton />}>
			<CustomerEditProfilePage />
		</Suspense>
	);
}
