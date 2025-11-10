import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF';
  merchantId?: string;
}

/**
 * Dashboard Home Page
 * 
 * Role-based content:
 * - SUPER_ADMIN: Platform-wide statistics
 * - MERCHANT_OWNER/STAFF: Merchant-specific statistics
 */
export default async function DashboardHomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const user = jwt.verify(token, JWT_SECRET) as JWTPayload;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Dashboard
        </h1>
        <p className="text-gray-600">
          {user.role === 'SUPER_ADMIN'
            ? 'Platform overview and management'
            : 'Manage your merchant operations'}
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-3xl">📊</span>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
              +12%
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">1,234</p>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-3xl">💰</span>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
              +8%
            </span>
          </div>
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">Rp 45.6M</p>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-3xl">🏪</span>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
              {user.role === 'SUPER_ADMIN' ? 'Active' : 'Menu Items'}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {user.role === 'SUPER_ADMIN' ? 'Merchants' : 'Menu Items'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {user.role === 'SUPER_ADMIN' ? '56' : '89'}
          </p>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-3xl">⭐</span>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
              Avg
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {user.role === 'SUPER_ADMIN' ? 'Platform Rating' : 'Merchant Rating'}
          </p>
          <p className="text-2xl font-bold text-gray-900">4.8</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Recent Orders</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <span className="text-xl">🛒</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Order #{12340000 + i}</p>
                  <p className="text-sm text-gray-600">Customer Name • 2 items</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">Rp 125,000</p>
                <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                  PENDING
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <button className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-left text-white shadow transition hover:from-orange-600 hover:to-orange-700">
          <div className="mb-2 text-3xl">📋</div>
          <h3 className="mb-1 font-bold">Manage Menu</h3>
          <p className="text-sm text-orange-100">Add or edit menu items</p>
        </button>

        <button className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-left text-white shadow transition hover:from-blue-600 hover:to-blue-700">
          <div className="mb-2 text-3xl">🛒</div>
          <h3 className="mb-1 font-bold">View Orders</h3>
          <p className="text-sm text-blue-100">Process pending orders</p>
        </button>

        <button className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-left text-white shadow transition hover:from-purple-600 hover:to-purple-700">
          <div className="mb-2 text-3xl">📈</div>
          <h3 className="mb-1 font-bold">View Reports</h3>
          <p className="text-sm text-purple-100">Analytics and insights</p>
        </button>
      </div>
    </div>
  );
}
