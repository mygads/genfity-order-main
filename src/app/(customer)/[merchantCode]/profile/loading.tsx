/**
 * Profile Page Loading Skeleton
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F5F5F5', maxWidth: '500px', margin: '0 auto' }}
    >
      {/* Header Skeleton */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Profile Card Skeleton */}
      <div className="p-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* User Info */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded-lg animate-pulse" />
          </div>

          {/* Menu Items */}
          <div className="py-2 space-y-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="ml-auto w-5 h-5 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Logout Button Skeleton */}
        <div className="mt-4">
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Footer Skeleton */}
      <div className="py-4 flex justify-center">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
