/**
 * Payment Page Loading Skeleton
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
          <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Order Summary Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3">
            <div className="flex justify-between">
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-20 bg-gray-300 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <div className="w-12 h-8 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* QR Code Area */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-center">
            <div className="w-48 h-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="mt-4 text-center">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mx-auto" />
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div className="bg-white p-4 border-t border-gray-200">
        <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
