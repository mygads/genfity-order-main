/**
 * Dashboard Settings Page
 * For SUPER_ADMIN, MERCHANT_OWNER
 * 
 * Merchant settings and configuration
 */
export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your merchant settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Merchant Info */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Merchant Information</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Merchant Name
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="My Restaurant"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Merchant Code
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
                placeholder="MERC123"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Street address, city, postal code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="08123456789"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600"
            >
              Save Changes
            </button>
          </form>
        </div>

        {/* Operating Hours */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Operating Hours</h2>
          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
              (day) => (
                <div key={day} className="flex items-center gap-3">
                  <input type="checkbox" className="h-4 w-4 rounded text-orange-500" />
                  <span className="w-24 text-sm font-medium text-gray-700">{day}</span>
                  <input
                    type="time"
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    defaultValue="09:00"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="time"
                    className="rounded border border-gray-300 px-2 py-1 text-sm"
                    defaultValue="21:00"
                  />
                </div>
              )
            )}
          </div>
          <button className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600">
            Update Hours
          </button>
        </div>

        {/* Payment Settings */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Payment Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-semibold text-gray-900">Cash Payment</p>
                <p className="text-sm text-gray-600">Accept cash at cashier</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-orange-500" checked readOnly />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-semibold text-gray-900">QR Code Payment</p>
                <p className="text-sm text-gray-600">Generate QR for orders</p>
              </div>
              <input type="checkbox" className="h-5 w-5 rounded text-orange-500" checked readOnly />
            </div>
          </div>
        </div>

        {/* Service Fee */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-gray-900">Service Fee</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Service Fee Percentage
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  defaultValue="10"
                />
                <span className="text-gray-700">%</span>
              </div>
            </div>
            <button className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600">
              Update Fee
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
