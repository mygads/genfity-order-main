/**
 * Order History Page Loading Skeleton
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
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Tab Filters Skeleton */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* Order Cards Skeleton */}
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
            {/* Order Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
            </div>

            {/* Order Items Preview */}
            <div className="flex gap-2 mb-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>

            {/* Order Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
