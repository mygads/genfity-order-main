import { 
  ChefHat, 
  UtensilsCrossed, 
  ShoppingBag, 
  Users, 
  Clock, 
  TrendingUp 
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function FnBSolutionPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative py-24 bg-gradient-to-br from-brand-50 to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm font-medium mb-6">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Solusi F&B Terlengkap
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Kelola Restoran Semudah <br />
              <span className="text-brand-600">Scan, Order, Serve</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Satu platform untuk semua jenis bisnis kuliner. Dari Coffee Shop, Fine Dining, hingga Cloud Kitchen. 
              Otomatisasi operasional dari meja pelanggan hingga dapur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/schedule-demo" className="px-8 py-3.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 shadow-lg hover:shadow-xl transition-all text-center">
                Konsultasi Gratis
              </Link>
              <Link href="/pricing" className="px-8 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-all text-center">
                Lihat Paket
              </Link>
            </div>
          </div>
          <div className="flex-1 relative min-h-[400px] w-full items-center justify-center flex">
             <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-2xl border border-gray-200">
                {/* Placeholder for F&B visualization */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <span className="text-gray-400 font-medium">F&B Dashboard Illustration</span>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Role Benefits */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Manfaat untuk Seluruh Tim Anda</h2>
            <p className="text-gray-500 text-lg">
              Genfity dirancang untuk memudahkan pekerjaan setiap peran di restoran Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                role: 'Pemilik Bisnis',
                icon: TrendingUp,
                desc: 'Pantau omzet real-time dari mana saja. Laporan laba rugi otomatis dan kontrol stok bahan baku anti-bocor.',
                color: 'blue'
              },
              {
                role: 'Staff / Waiter',
                icon: Users,
                desc: 'Ambil pesanan lebih cepat dengan Mobile POS. Tidak perlu bolak-balik ke dapur karena struk tercetak otomatis.',
                color: 'green'
              },
              {
                role: 'Tim Dapur',
                icon: ChefHat,
                desc: 'Lihat pesanan di Kitchen Display System (KDS). Urutkan pesanan berdasarkan waktu masuk. Minimalkan kesalahan masak.',
                color: 'orange'
              }
            ].map((item) => (
              <div key={item.role} className="p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl transition-shadow group">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-${item.color}-50 group-hover:bg-${item.color}-100 transition-colors`}>
                  <item.icon className={`w-7 h-7 text-${item.color}-600`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.role}</h3>
                <p className="text-gray-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram (Text based for now) */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-16">Alur Pemesanan Tanpa Hambatan</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: '1. Scan QR', desc: 'Pelanggan scan QR di meja, lihat menu digital, dan pilih pesanan sendiri.' },
              { title: '2. Pesanan Masuk', desc: 'Order otomatis masuk ke POS Kasir dan tercetak di printer dapur/bar.' },
              { title: '3. Persiapan', desc: 'Dapur menyiapkan pesanan. Waiter dapat notifikasi jika makanan siap.' },
              { title: '4. Pembayaran', desc: 'Pelanggan bayar via E-wallet di meja atau tunai di kasir saat keluar.' }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-4xl font-black text-gray-100 absolute top-4 right-4">{idx + 1}</div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 relative z-10">{step.title}</h4>
                <p className="text-sm text-gray-600 relative z-10">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 bg-brand-600 rounded-3xl p-12 text-center text-white relative overflow-hidden">
          <div className="abslute inset-0 bg-[url('/images/pattern.png')] opacity-10"></div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Cocok untuk Bisnis F&B Anda?</h2>
          <p className="text-brand-100 text-lg mb-8 max-w-2xl mx-auto relative z-10">
            Diskusikan alur operasional unik restoran Anda dengan tim konsultan kami. Gratis demo produk.
          </p>
          <div className="relative z-10">
            <Link href="/schedule-demo" className="inline-block px-8 py-4 bg-white text-brand-600 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-2xl">
              Jadwalkan Demo Sekarang
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
