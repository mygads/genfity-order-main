import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  Gift 
} from 'lucide-react';
import Link from 'next/link';

export default function InfluencerProgramPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="pt-24 pb-20 bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-6">
            Genfity Partner Program
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            Ubah Relasi Jadi <span className="text-purple-600">Passive Income</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Ajak pemilik bisnis F&B menggunakan Genfity dan dapatkan komisi 10% setiap bulan selama mereka berlangganan.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/influencer/register" className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
              Daftar Jadi Partner
            </Link>
            <Link href="#commission" className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              Pelajari Komisi
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            {[
              { title: '1. Daftar', desc: 'Registrasi gratis dalam 2 menit. Dapatkan kode referral unik Anda.' },
              { title: '2. Bagikan', desc: 'Rekomendasikan Genfity ke pemilik kafe, resto, atau UMKM F&B.' },
              { title: '3. Cuan Rutin', desc: 'Terima transfer komisi setiap bulan, cair otomatis ke rekening Anda.' }
            ].map((step) => (
              <div key={step.title} className="p-8 bg-gray-50 rounded-2xl">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commission Detail */}
      <section id="commission" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Skema Komisi Transparan</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1">10% Recurring Commission</h4>
                  <p className="text-gray-400">Dapatkan 10% dari nilai langganan merchant setiap bulan. Bukan satu kali saja!</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xl font-bold mb-1">Lifetime Earning</h4>
                  <p className="text-gray-400">Selama merchant aktif menggunakan Genfity, Anda terus menerima komisi.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 bg-gray-800 rounded-2xl p-8 border border-gray-700">
            <h3 className="text-lg font-medium text-gray-400 mb-6">Simulasi Pendapatan Bulanan</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span>10 Merchant Pro</span>
                <span className="text-purple-400 font-bold">Rp 2.500.000 / bln</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span>50 Merchant Pro</span>
                <span className="text-purple-400 font-bold">Rp 12.500.000 / bln</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-xl font-bold text-white">100 Merchant Pro</span>
                <span className="text-2xl font-bold text-purple-400">Rp 25.000.000 / bln</span>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500 mt-6">*Simulasi estimasi paket Pro (Rp249rb/bulan)</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Siapa yang Bisa Bergabung?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {['Food Blogger', 'Konsultan F&B', 'Agency Digital', 'Komunitas Bisnis'].map((role) => (
              <div key={role} className="p-4 bg-gray-50 rounded-xl font-medium text-gray-700 hover:bg-gray-100 hover:text-purple-600 transition-colors">
                {role}
              </div>
            ))}
          </div>
          
          <div className="mt-16">
            <Link href="/influencer/register" className="inline-block px-12 py-4 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-all">
              Mulai Sekarang
            </Link>
            <p className="mt-4 text-sm text-gray-500">Gratis pendaftaran. Tanpa target minimal.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
