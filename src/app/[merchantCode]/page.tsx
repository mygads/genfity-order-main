import { notFound } from 'next/navigation';
import Link from 'next/link';

interface MerchantPageProps {
  params: Promise<{
    merchantCode: string;
  }>;
}

/**
 * Merchant Mode Selection Page
 * - Choose dine-in or takeaway mode
 * - Display merchant info
 * - Show outlet details (#outlet anchor)
 * - Opening hours
 */
export default async function MerchantPage({ params }: MerchantPageProps) {
  const { merchantCode } = await params;
  
  // Fetch merchant data
  let merchant;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/public/merchants/${merchantCode}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      notFound();
    }

    const data = await response.json();
    merchant = data.data;
  } catch (error) {
    console.error('Failed to fetch merchant:', error);
    notFound();
  }

  const dayNames = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold text-gray-900">GENFITY</span>
            </Link>
            <Link
              href="/profile"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              👤 Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Merchant Header */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-white shadow-xl">
          <h1 className="text-3xl font-bold">{merchant.name}</h1>
          {merchant.description && (
            <p className="mt-2 text-orange-100">{merchant.description}</p>
          )}
        </div>

        {/* Mode Selection */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900">Pilih Tipe Pemesanan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Link
              href={`/${merchantCode}/home?mode=dinein`}
              className="group overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition hover:shadow-xl"
            >
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl transition group-hover:bg-orange-500 group-hover:text-white">
                  🍽️
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Makan di Tempat</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Nikmati makanan langsung di outlet
                </p>
              </div>
            </Link>

            <Link
              href={`/${merchantCode}/home?mode=takeaway`}
              className="group overflow-hidden rounded-2xl bg-white p-8 shadow-lg transition hover:shadow-xl"
            >
              <div className="text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl transition group-hover:bg-orange-500 group-hover:text-white">
                  🛍️
                </div>
                <h3 className="mt-4 text-xl font-bold text-gray-900">Ambil Sendiri</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Pesan sekarang, ambil nanti
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Outlet Info */}
        <div id="outlet" className="mt-8 scroll-mt-20">
          <h2 className="text-2xl font-bold text-gray-900">Info Outlet</h2>
          <div className="mt-4 overflow-hidden rounded-2xl bg-white p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900">{merchant.name}</h3>
            
            {merchant.address && (
              <div className="mt-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📍</span>
                  <p className="text-gray-600">{merchant.address}</p>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-4">
              {merchant.phone && (
                <a
                  href={`tel:${merchant.phone}`}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  📞 Hubungi outlet
                </a>
              )}
              {merchant.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-orange-500 bg-white px-4 py-2 text-sm font-semibold text-orange-500 transition hover:bg-orange-50"
                >
                  🗺️ Kunjungi outlet
                </a>
              )}
            </div>

            {/* Opening Hours */}
            {merchant.openingHours && merchant.openingHours.length > 0 && (
              <div className="mt-6">
                <h4 className="font-bold text-gray-900">Jam Operasional</h4>
                <div className="mt-3 space-y-2">
                  {merchant.openingHours
                    .sort((a: { dayOfWeek: number }, b: { dayOfWeek: number }) => a.dayOfWeek - b.dayOfWeek)
                    .map((hours: {
                      id: bigint;
                      dayOfWeek: number;
                      isClosed: boolean;
                      is24Hours: boolean;
                      openTime?: string;
                      closeTime?: string;
                    }) => (
                      <div
                        key={hours.id.toString()}
                        className="flex items-center justify-between border-b border-gray-100 py-2"
                      >
                        <span className="font-medium text-gray-700">
                          {dayNames[hours.dayOfWeek]}
                        </span>
                        <span className="text-gray-600">
                          {hours.isClosed
                            ? 'Tutup'
                            : hours.is24Hours
                            ? 'Buka 24 Jam'
                            : `${hours.openTime} - ${hours.closeTime}`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
