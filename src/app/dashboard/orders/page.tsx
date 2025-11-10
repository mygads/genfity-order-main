/**
 * Dashboard Orders Page
 * For SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF
 * 
 * View and manage orders
 */
export default function OrdersPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600">Manage and process orders</p>
        </div>
        <div className="flex gap-3">
          <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
            <option>All Status</option>
            <option>PENDING</option>
            <option>ACCEPTED</option>
            <option>PREPARING</option>
            <option>READY</option>
            <option>COMPLETED</option>
          </select>
          <select className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">
            <option>Today</option>
            <option>Yesterday</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                  <span className="text-2xl">🛒</span>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-3">
                    <h3 className="font-mono text-lg font-bold text-gray-900">
                      #{12340000 + i}
                    </h3>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                      PENDING
                    </span>
                  </div>
                  <p className="mb-1 text-sm text-gray-600">Customer Name</p>
                  <p className="text-sm text-gray-500">
                    {i % 2 === 0 ? '🍽️ Dine-in • Table 5' : '🛍️ Takeaway'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">10 minutes ago</p>
                <p className="mt-1 text-xl font-bold text-gray-900">Rp 125,000</p>
              </div>
            </div>

            <div className="mb-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-sm font-semibold text-gray-700">Order Items:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 2x Nasi Goreng Special</li>
                <li>• 1x Es Teh Manis</li>
                <li>• 1x Ayam Geprek</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 rounded-lg bg-red-500 px-4 py-2 font-semibold text-white transition hover:bg-red-600">
                Reject
              </button>
              <button className="flex-1 rounded-lg bg-green-500 px-4 py-2 font-semibold text-white transition hover:bg-green-600">
                Accept
              </button>
              <button className="rounded-lg bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-200">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
