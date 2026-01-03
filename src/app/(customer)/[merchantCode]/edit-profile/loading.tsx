/**
 * Edit Profile Page Loading Skeleton
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
        <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center py-4">
          <div className="w-24 h-24 bg-gray-200 rounded-full animate-pulse mb-3" />
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div>
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div>
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white p-4 border-t border-gray-200">
        <div className="h-12 w-full bg-gray-300 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
