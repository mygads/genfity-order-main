/**
 * Order Page (Cart) Loading Skeleton
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
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* Order Type Tabs */}
      <div className="bg-white px-4 py-2 flex gap-2 border-b border-gray-200">
        <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Table Number / Delivery Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Cart Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="w-6 h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add More Items */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-20 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Bottom Checkout */}
      <div className="bg-white p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-24 bg-gray-300 rounded animate-pulse" />
        </div>
        <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
