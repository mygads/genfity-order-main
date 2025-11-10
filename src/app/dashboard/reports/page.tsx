/**
 * Dashboard Reports Page
 * For SUPER_ADMIN, MERCHANT_OWNER
 * 
 * Analytics and insights
 */
export default function ReportsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600">Business insights and performance metrics</p>
      </div>

      {/* Date Filter */}
      <div className="mb-6 flex gap-3">
        <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 3 months</option>
          <option>Last year</option>
        </select>
        <button className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
          Export Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid gap-6 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 text-3xl">📊</div>
          <p className="mb-1 text-sm text-gray-600">Total Orders</p>
          <p className="mb-1 text-2xl font-bold text-gray-900">1,234</p>
          <p className="text-xs text-green-600">+12% from last period</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 text-3xl">💰</div>
          <p className="mb-1 text-sm text-gray-600">Revenue</p>
          <p className="mb-1 text-2xl font-bold text-gray-900">Rp 45.6M</p>
          <p className="text-xs text-green-600">+8% from last period</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 text-3xl">📈</div>
          <p className="mb-1 text-sm text-gray-600">Avg Order Value</p>
          <p className="mb-1 text-2xl font-bold text-gray-900">Rp 37K</p>
          <p className="text-xs text-red-600">-3% from last period</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 text-3xl">⭐</div>
          <p className="mb-1 text-sm text-gray-600">Customer Rating</p>
          <p className="mb-1 text-2xl font-bold text-gray-900">4.8</p>
          <p className="text-xs text-green-600">+0.2 from last period</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Chart */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Sales Trend</h2>
          <div className="flex h-64 items-end justify-around gap-2">
            {[65, 45, 78, 82, 55, 90, 72].map((height, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-orange-500"
                  style={{ height: `${height}%` }}
                />
                <p className="text-xs text-gray-600">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Top Menu Items</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <span className="text-xl">🍔</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Menu Item {i}</p>
                    <p className="text-sm text-gray-600">{234 - i * 20} orders</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">Rp {(12 - i) * 100}K</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Status Distribution */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 font-bold text-gray-900">Order Status Distribution</h2>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            { status: 'PENDING', count: 12, color: 'yellow' },
            { status: 'ACCEPTED', count: 8, color: 'blue' },
            { status: 'PREPARING', count: 15, color: 'purple' },
            { status: 'READY', count: 5, color: 'green' },
            { status: 'COMPLETED', count: 234, color: 'gray' },
          ].map((item) => (
            <div key={item.status} className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="mb-2 text-2xl font-bold text-gray-900">{item.count}</p>
              <p className="text-sm font-medium text-gray-600">{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
