/**
 * Dashboard Merchants Page
 * For SUPER_ADMIN only
 * 
 * Lists all merchants in the platform
 */
export default function MerchantsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
          <p className="text-gray-600">Manage all merchants in the platform</p>
        </div>
        <button className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600">
          + Add Merchant
        </button>
      </div>

      {/* Merchants Table */}
      <div className="rounded-2xl bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Merchant
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Code
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Orders
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Revenue
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                        <span className="text-xl">🏪</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Merchant Name {i}</p>
                        <p className="text-sm text-gray-600">merchant{i}@example.com</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-gray-900">MERC{i}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">1,234</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rp 12.5M
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-sm font-medium text-orange-600 hover:text-orange-700">
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
