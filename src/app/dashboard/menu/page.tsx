/**
 * Dashboard Menu Page
 * For SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF
 * 
 * Manage menu items and categories
 */
export default function MenuPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">Manage menu items and categories</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 transition hover:bg-gray-300">
            + Add Category
          </button>
          <button className="rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600">
            + Add Menu Item
          </button>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-200">
              <span className="text-6xl">🍔</span>
            </div>
            <div className="mb-3">
              <h3 className="mb-1 font-bold text-gray-900">Menu Item {i}</h3>
              <p className="text-sm text-gray-600">Category Name</p>
            </div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-bold text-orange-600">Rp 45,000</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                Available
              </span>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200">
                Edit
              </button>
              <button className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600">
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
