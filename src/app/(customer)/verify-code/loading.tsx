/**
 * Verify Code Page Loading Skeleton
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
      <div className="flex-1 p-6">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse" />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-60 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>

        {/* OTP Input Boxes */}
        <div className="flex justify-center gap-3 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-12 h-14 bg-gray-200 rounded-lg animate-pulse"
            />
          ))}
        </div>

        {/* Submit Button */}
        <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse mb-4" />

        {/* Resend Link */}
        <div className="flex justify-center">
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 flex justify-center">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
