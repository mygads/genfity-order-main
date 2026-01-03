/**
 * Order Tracking Page Loading Skeleton
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

      {/* Status Card Skeleton */}
      <div className="p-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          {/* Order Number */}
          <div className="flex justify-between items-center mb-4">
            <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
          </div>

          {/* Status Timeline */}
          <div className="space-y-4 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items Card */}
        <div className="bg-white rounded-lg p-4 shadow-sm mt-4">
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
            <div className="h-5 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
