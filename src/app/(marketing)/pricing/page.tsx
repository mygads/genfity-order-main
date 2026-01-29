import { Check, X, HelpCircle } from 'lucide-react';
import Link from 'next/link';

const TIERS = [
  {
    name: 'Starter',
    price: '0,-',
    period: 'selamanya',
    desc: 'Untuk warung makan & rintisan usaha.',
    features: [
      '1 Outlet',
      'QR Ordering (Dine-in Only)',
      'POS Kasir Dasar',
      'Laporan Penjualan Harian',
      'Max 50 Transaksi/hari',
      'Support Email'
    ],
    cta: 'Daftar Gratis',
    ctaLink: '/admin/register?plan=starter',
    popular: false
  },
  {
    name: 'Pro',
    price: '249rb',
    period: '/bulan',
    desc: 'Fitur lengkap untuk café & resto sibuk.',
    features: [
      '3 Outlet',
      'QR Ordering & Delivery',
      'Manajemen Stok & Resep',
      'Laporan Laba Rugi',
      'Manajemen Meja & Reservasi',
      'Voucher & Promo',
      'Unlimited Transaksi',
      'Support WhatsApp Prioritas'
    ],
    cta: 'Coba Gratis 14 Hari',
    ctaLink: '/admin/register?plan=pro',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Hubungi Kami',
    period: '',
    desc: 'Untuk franchise & multi-brand besar.',
    features: [
      'Unlimited Outlet',
      'Dedicated Servers',
      'Custom API Integration',
      'White Label Customer App',
      'SLA Guarantee 99.9%',
      'Dedicated Account Manager',
      'Custom Training'
    ],
    cta: 'Jadwalkan Demo',
    ctaLink: '/schedule-demo',
    popular: false
  }
];

export default function PricingPage() {
  return (
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Harga Transparan, <br className="hidden md:block"/>Tanpa Biaya Tersembunyi</h1>
          <p className="text-xl text-gray-500">
            Pilih paket yang sesuai dengan fase bisnis Anda. Upgrade atau downgrade kapan saja.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div 
              key={tier.name}
              className={`relative rounded-2xl p-8 border ${
                tier.popular 
                  ? 'border-brand-500 shadow-xl scale-105 z-10 bg-white' 
                  : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-lg transition-all'
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Paling Populer
                </div>
              )}
              
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="text-sm text-gray-500 font-medium">{tier.period}</span>
                </div>
                <p className="text-sm text-gray-500 mt-4">{tier.desc}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${tier.popular ? 'text-brand-500' : 'text-gray-400'}`} />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={tier.ctaLink}
                className={`block w-full text-center py-3 rounded-xl font-medium transition-all ${
                  tier.popular
                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg hover:shadow-xl'
                    : 'bg-white text-gray-900 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Fitur Add-on</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              { name: 'Grab/Gojek Integration', price: '+50rb/outlet' },
              { name: 'Accounting System', price: '+100rb/bulan' },
              { name: 'Loyalty App', price: '+150rb/bulan' },
              { name: 'Extra Device', price: 'Gratis' }
            ].map((addon) => (
              <div key={addon.name} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <h4 className="font-semibold text-gray-900">{addon.name}</h4>
                <p className="text-sm text-gray-500 mt-1">{addon.price}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 border-t border-gray-100 pt-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">FAQ Harga</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <details className="group border rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-gray-900 font-medium">
                <h2 className="text-lg">Apakah ada biaya setup awal?</h2>
                <span className="relative h-5 w-5 shrink-0">
                  <span className="absolute inset-0 m-auto h-5 w-0.5 rounded-full bg-gray-400 transition-all group-open:rotate-90"></span>
                  <span className="absolute inset-0 m-auto h-0.5 w-5 rounded-full bg-gray-400"></span>
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-gray-700">
                Tidak ada. Anda bisa mendaftar dan mulai menggunakan Genfity secara gratis tanpa biaya setup.
              </p>
            </details>
            <details className="group border rounded-xl p-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-1.5 text-gray-900 font-medium">
                <h2 className="text-lg">Bisakah saya ganti paket nanti?</h2>
                <span className="relative h-5 w-5 shrink-0">
                  <span className="absolute inset-0 m-auto h-5 w-0.5 rounded-full bg-gray-400 transition-all group-open:rotate-90"></span>
                  <span className="absolute inset-0 m-auto h-0.5 w-5 rounded-full bg-gray-400"></span>
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-gray-700">
                Ya, Anda bisa upgrade atau downgrade paket kapan saja melalui dashboard admin. Perubahan tarif akan berlaku prorata.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
