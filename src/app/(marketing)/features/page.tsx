import { Check } from 'lucide-react';

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className}`}>
    {children}
  </span>
);

const FEATURE_CATEGORIES = [
  {
    title: 'Pemesanan & Meja',
    items: [
      { name: 'QR Table Ordering', desc: 'Scan QR di meja, pesan, bayar.', status: 'Included' },
      { name: 'Takeaway / Pickup', desc: 'Pesan untuk dibawa pulang.', status: 'Included' },
      { name: 'Delivery Integration', desc: 'Terintegrasi kurir pengiriman (Grab/Gojek).', status: 'Add-on' },
      { name: 'Manajemen Meja', desc: 'Denah meja visual & status real-time.', status: 'Included' },
      { name: 'Reservasi Online', desc: 'Pelanggan booking meja via web/app.', status: 'Included' },
      { name: 'Multi-Bill (Split Bill)', desc: 'Pisah pembayaran per item atau nominal.', status: 'Included' }
    ]
  },
  {
    title: 'POS & Pembayaran',
    items: [
      { name: 'Cloud POS', desc: 'Akses dari tablet, HP, atau desktop.', status: 'Included' },
      { name: 'Kasir Offline Mode', desc: 'Tetap jualan saat internet mati.', status: 'Terbatas' },
      { name: 'E-Wallet Integration', desc: 'QRIS, OVO, Dana, ShopeePay otomatis.', status: 'Included' },
      { name: 'Mobile EDC Payment', desc: 'Terima kartu debit/kredit.', status: 'Add-on' },
      { name: 'Open Bill / Tab', desc: 'Simpan pesanan, bayar belakangan.', status: 'Included' },
      { name: 'Rekap Shift Kasir', desc: 'Laporan tutup kasir & setoran.', status: 'Included' }
    ]
  },
  {
    title: 'Operasional Dapur',
    items: [
      { name: 'Kitchen Display (KDS)', desc: 'Layar pesanan digital untuk dapur.', status: 'Included' },
      { name: 'Cetak Struk Dapur', desc: 'Printer checker & order otomatis.', status: 'Included' },
      { name: 'Waiters App (PDA)', desc: 'Aplikasi khusus pelayan ambil order.', status: 'Included' },
      { name: 'Order Routing', desc: 'Pisah sturuk bar/dapur otomatis.', status: 'Included' },
      { name: 'Timer Pesanan', desc: 'Pantau durasi masak per meja.', status: 'Pro' }
    ]
  },
  {
    title: 'Manajemen Menu',
    items: [
      { name: 'Menu Digital', desc: 'Foto, deskripsi, badging (Pedas/Chef Rec).', status: 'Included' },
      { name: 'Varian & Modifiers', desc: 'Opsi topping, level pedas, dll.', status: 'Included' },
      { name: 'Manajemen Stok', desc: 'Potong stok otomatis per porsi.', status: 'Included' },
      { name: 'Jadwal Menu', desc: 'Menu sarapan/lunch otomatis.', status: 'Included' },
      { name: 'Harga Dinamis', desc: 'Harga beda ojol vs dine-in.', status: 'Included' }
    ]
  },
  {
    title: 'Marketing & Retensi',
    items: [
      { name: 'Voucher & Promo', desc: 'Kode promo, diskon jam tertentu.', status: 'Included' },
      { name: 'Member & Poin', desc: 'Sistem loyalitas pelanggan.', status: 'Pro' },
      { name: 'Broadcast WA', desc: 'Kirim promo via WhatsApp.', status: 'Add-on' },
      { name: 'Review Pelanggan', desc: 'Kumpulkan ulasan otomatis.', status: 'Included' }
    ]
  },
  {
    title: 'Laporan & Analitik',
    items: [
      { name: 'Dashboard Real-time', desc: 'Pantau omzet live dari HP.', status: 'Included' },
      { name: 'Laporan Penjualan', desc: 'Per produk, kategori, jam sibuk.', status: 'Included' },
      { name: 'Export Excel/PDF', desc: 'Download laporan detail.', status: 'Included' },
      { name: 'Laporan Laba Rugi', desc: 'Estimasi profit harian.', status: 'Pro' }
    ]
  }
];

export default function FeaturesPage() {
  return (
    <div className="bg-white pb-20">
      
      {/* Hero */}
      <section className="bg-gray-50 pt-20 pb-32 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Fitur Lengkap untuk <span className="text-brand-600">Skala Apapun</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Dari warung makan hingga franchise ratusan cabang, Genfity Order punya modul yang Anda butuhkan.
          </p>
        </div>
      </section>

      {/* Feature Matrix */}
      <section className="max-w-7xl mx-auto px-4 -mt-20">
        <div className="space-y-12">
          {FEATURE_CATEGORIES.map((category) => (
            <div key={category.title} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-white border-b border-gray-100 p-6 md:p-8">
                <h2 className="text-2xl font-bold text-gray-900">{category.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                {category.items.map((item) => (
                  <div key={item.name} className="p-6 md:p-8 hover:bg-gray-50 transition-colors border-b border-gray-100 md:border-b-0 lg:border-b-0">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg text-gray-900">{item.name}</h3>
                      {item.status !== 'Included' && (
                        <Badge className={`text-xs ${
                          item.status === 'Pro' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                          item.status === 'Add-on' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">
                      {item.desc}
                    </p>
                    <div className="flex items-center text-xs font-medium text-brand-600">
                      <Check className="w-3 h-3 mr-1.5" />
                      Tersedia
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto mt-24 px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Siap untuk Upgrade Bisnis?</h2>
        <p className="text-gray-600 mb-8">Konsultasikan kebutuhan fitur Anda dengan tim ahli kami.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/pricing" className="px-8 py-3 bg-white text-gray-900 border border-gray-200 rounded-full hover:bg-gray-50 transition-all font-medium">
            Lihat Harga
          </a>
          <a href="/schedule-demo" className="px-8 py-3 bg-brand-600 text-white rounded-full hover:bg-brand-700 transition-all font-medium shadow-lg hover:shadow-xl">
            Hubungi Sales
          </a>
        </div>
      </section>
      
    </div>
  );
}
