/**
 * Search Page Loading Skeleton
 * Instant visual feedback for search page
 */
export default function Loading() {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: '#F5F5F5', maxWidth: '500px', margin: '0 auto' }}
    >
      {/* Search Header Skeleton */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E6E6E6',
        }}
      >
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 h-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse shrink-0" />
        </div>
      </div>

      {/* Filter Pills Skeleton */}
      <div className="flex gap-2 px-4 py-3 overflow-hidden bg-white border-b border-gray-100">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse shrink-0" />
        ))}
      </div>

      {/* Results Count Skeleton */}
      <div className="px-4 py-3">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Search Results Skeleton */}
      <div className="px-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '12px',
            }}
          >
            <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="flex justify-between items-center pt-1">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
