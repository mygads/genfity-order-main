/**
 * Login Page Loading Skeleton
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
          <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Logo Area */}
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto" />
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3">
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-gray-200" />
          <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Form Skeleton */}
        <div className="space-y-4">
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 flex justify-center">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
