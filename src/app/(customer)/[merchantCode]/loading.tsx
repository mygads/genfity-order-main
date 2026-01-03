import LoadingState from '@/components/common/LoadingState';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <LoadingState type="page" message="Loading..." />
    </div>
  );
}
