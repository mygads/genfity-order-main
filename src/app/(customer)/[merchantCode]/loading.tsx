/**
 * Merchant Page Loading Skeleton - ESB Style
 * Instant visual feedback matching the order page design
 */
export default function Loading() {
  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: '#F5F5F5', maxWidth: '500px', margin: '0 auto' }}
    >
      {/* Banner Skeleton */}
      <div className="relative">
        <div className="w-full h-40 bg-gray-300 dark:bg-gray-700 animate-pulse" />
        {/* Back Button */}
        <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/80 animate-pulse" />
      </div>

      {/* Restaurant Info Card Skeleton */}
      <div style={{ padding: '0 16px', marginTop: '-24px', position: 'relative', zIndex: 10 }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: '12px' }} />

      {/* Category Tabs Skeleton */}
      <div
        style={{
          height: '48px',
          borderBottom: '1px solid #E6E6E6',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div className="flex gap-4 px-4 h-full items-center overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-20 bg-gray-200 rounded animate-pulse shrink-0" />
          ))}
        </div>
      </div>

      {/* Horizontal Menu Carousel Skeleton */}
      <div style={{ marginTop: '16px', overflow: 'hidden' }}>
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mx-4 mb-3" />
        <div className="flex gap-3 px-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: '140px',
                flexShrink: 0,
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '8px',
              }}
            >
              <div className="w-full h-24 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse mt-2" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Menu List Skeleton */}
      <div style={{ marginTop: '16px', padding: '0 16px' }}>
        <div className="h-5 w-28 bg-gray-200 rounded animate-pulse mb-3" />
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden' }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px',
                borderBottom: i < 4 ? '1px solid #E6E6E6' : 'none',
              }}
            >
              <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                <div className="flex justify-between items-center pt-1">
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 w-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
