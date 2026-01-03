/**
 * Order Summary Cash Page Loading Skeleton
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#F5F5F5', maxWidth: '500px', margin: '0 auto' }}
    >
      {/* Header Skeleton */}
      <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-gray-200">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Success Icon */}
        <div className="flex justify-center py-6">
          <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Status Text */}
        <div className="text-center">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="border-t border-gray-100 mt-4 pt-4">
            <div className="flex justify-between">
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-24 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <div className="bg-white p-4 border-t border-gray-200 space-y-2">
        <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse" />
        <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
