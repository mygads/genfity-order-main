import { notFound } from 'next/navigation';
import { 
  QrCode, 
  Monitor, 
  Smartphone, 
  Server, 
  Tablet, 
  Tv, 
  CalendarClock, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

// Product Data
interface ProductDef {
  title: string;
  subtitle: string;
  icon: any;
  benefits: string[];
  desc: string;
}

const PRODUCTS: Record<string, ProductDef> = {
  'qr-ordering': {
    title: 'QR Table Ordering',
    subtitle: 'Pelanggan Pesan & Bayar Sendiri dari Meja',
    icon: QrCode,
    benefits: [
      'Kurangi antrian di kasir',
      'Minimalkan kesalahan order waiter',
      'Tingkatkan omzet dengan foto menu menarik',
      'Hemat biaya operasional SDM'
    ],
    desc: 'Sistem pemesanan mandiri berbasis QR Code yang terintegrasi langsung dengan dapur dan kasir. Tidak perlu install aplikasi, cukup scan kamera HP.',
  },
  'pos': {
    title: 'Cloud POS Kasir',
    subtitle: 'Sistem Kasir Online & Offline Anti-Lelet',
    icon: Monitor,
    benefits: [
      'Bisa jalan offline saat internet mati',
      'Terintegrasi GrabFood / GoFood (Add-on)',
      'Kelola diskon & voucher otomatis',
      'Laporan penjualan real-time'
    ],
    desc: 'Kasir berbasis cloud yang cepat, stabil, dan mudah digunakan. Pantau performa seluruh cabang dari satu dashboard admin.',
  },
  'mobile-pos': {
    title: 'Mobile POS',
    subtitle: 'Terima Order di Mana Saja',
    icon: Smartphone,
    benefits: [
      'Cocok untuk *line busting* saat antri panjang',
      'Terima pembayaran kartu/QRIS di tempat',
      'Ringan & portabel untuk pegawai',
      'Hemat tempat counter kasir'
    ],
    desc: 'Ubah smartphone Android menjadi mesin kasir powerful. Solusi tepat untuk food truck, bazaar, atau restoran dengan area luas.',
  },
  'kds': {
    title: 'Kitchen Display System',
    subtitle: 'Revolusi Manajemen Pesanan Dapur',
    icon: Server,
    benefits: [
      'Tidak ada kertas struk yang hilang/basah',
      'Warna indikator waktu tunggu pesanan',
      'Urutkan pesanan otomatis (FIFO)',
      'Analisa durasi masak per menu'
    ],
    desc: 'Ganti printer dapur berisik dengan layar digital cerdas. KDS membantu koki bekerja lebih terorganisir dan cepat.',
  },
  'pda': {
    title: 'PDA Waiter App',
    subtitle: 'Senjata Andalan Pelayan Restoran',
    icon: Tablet,
    benefits: [
      'Input order langsung di samping meja',
      'Info stok habis real-time',
      'Catat *custom notes* pelanggan',
      'Upselling dengan rekomendasi menu'
    ],
    desc: 'Aplikasi khusus staff untuk mencatat pesanan tamu. Mengurangi bolak-balik ke station kasir dan mempercepat layanan.',
  },
  'customer-display': {
    title: 'Customer Facing Display',
    subtitle: 'Layar Transparansi untuk Pelanggan',
    icon: Tv,
    benefits: [
      'Tampilkan detail pesanan & harga',
      'QRIS dinamis untuk pembayaran',
      'Running text promo / iklan',
      'Tingkatkan kepercayaan pelanggan'
    ],
    desc: 'Layar sekunder yang menghadap pelanggan saat di kasir. Menampilkan rincian belanja dan media promosi visual.',
  },
  'scheduled-order': {
    title: 'Scheduled Order',
    subtitle: 'Pesan Sekarang, Ambil Nanti',
    icon: CalendarClock,
    benefits: [
      'Pre-order untuk event / catering',
      'Atur slot waktu pengambilan/pengiriman',
      'Pembayaran di muka mengamankan order',
      'Perencanaan produksi dapur lebih baik'
    ],
    desc: 'Fitur pemesanan terjadwal untuk katering, langganan catering harian, atau pesanan besar yang butuh persiapan khusus.',
  }
};

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage(props: ProductPageProps) {
  const params = await props.params;

  const product = PRODUCTS[params.slug];

  if (!product) {
    notFound();
  }

  const Icon = product.icon;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gray-50 pt-24 pb-32 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="mx-auto w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-8 border border-brand-100 shadow-sm">
            <Icon className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 max-w-4xl mx-auto">
            {product.title}
          </h1>
          <p className="text-2xl text-gray-600 mb-10 font-light">
            {product.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/schedule-demo" className="px-8 py-3 bg-brand-600 text-white rounded-full font-medium hover:bg-brand-700 transition-all shadow-lg active:scale-95">
              Jadwalkan Demo
            </Link>
            <Link href="/pricing" className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-all">
              Lihat Harga
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
             <div className="space-y-8">
               <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">Kenapa {product.title}?</h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {product.desc}
                  </p>
               </div>
               
               <ul className="space-y-4">
                 {product.benefits.map((benefit: string) => (
                   <li key={benefit} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <CheckCircle2 className="w-6 h-6 text-brand-600 shrink-0" />
                      <span className="font-medium text-gray-900">{benefit}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>
          
          <div className="flex-1">
             {/* Placeholder for Product UI screenshot */}
             <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl border-4 border-gray-200 shadow-2xl flex items-center justify-center overflow-hidden">
                <div className="text-center p-8">
                   <Icon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                   <p className="text-gray-400 font-medium text-lg">UI Mockup: {product.title}</p>
                   <p className="text-sm text-gray-300 mt-2">High-fidelity dashboard screenshot here</p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 flex gap-1">
                   <div className="w-2 h-2 rounded-full bg-red-400"></div>
                   <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                   <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
             </div>
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-24 bg-gray-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-6">Mulai Gunakan {product.title} Hari Ini</h2>
          <p className="text-gray-400 mb-8 text-lg">Bergabung dengan ribuan bisnis F&B lainnya yang telah beralih ke digital.</p>
          <Link href="/admin/register" className="inline-flex items-center px-8 py-4 bg-white text-gray-900 rounded-full font-bold hover:bg-gray-100 transition-colors">
            Coba Gratis Sekarang
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

export async function generateStaticParams() {
   return Object.keys(PRODUCTS).map(slug => ({ slug }));
}
