/**
 * Privacy Policy Page Loading Skeleton
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
        <div className="bg-white rounded-xl p-4 shadow-sm">
          {/* Title */}
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />

          {/* Last Updated */}
          <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-6" />

          {/* Content Paragraphs */}
          <div className="space-y-4">
            {[...Array(5)].map((_, sectionIndex) => (
              <div key={sectionIndex}>
                <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-4 flex justify-center">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
