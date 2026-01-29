import { Check, X, Minus } from 'lucide-react';
import Link from 'next/link';

const COMPETITORS = [
  'Genfity',
  'Moka',
  'Majoo',
  'Pawoon'
];

const FEATURES = [
  { group: 'Essentials', name: 'Cloud POS', genfity: true, moka: true, majoo: true, pawoon: true },
  { group: 'Essentials', name: 'Offline Mode', genfity: true, moka: false, majoo: true, pawoon: true },
  { group: 'Essentials', name: 'Multi-outlet', genfity: true, moka: true, majoo: true, pawoon: true },
  
  { group: 'Ordering', name: 'QR Table Order', genfity: true, moka: false, majoo: false, pawoon: false },
  { group: 'Ordering', name: 'Kitchen Display System', genfity: true, moka: false, majoo: true, pawoon: false },
  { group: 'Ordering', name: 'Waiter App', genfity: true, moka: true, majoo: true, pawoon: true },
  
  { group: 'Inventory', name: 'Stock & Recipe', genfity: true, moka: true, majoo: true, pawoon: true },
  { group: 'Inventory', name: 'Central Kitchen', genfity: true, moka: false, majoo: true, pawoon: false },
  
  { group: 'Marketing', name: 'Loyalty Program', genfity: true, moka: true, majoo: true, pawoon: true },
  { group: 'Marketing', name: 'WhatsApp Marketing', genfity: true, moka: false, majoo: true, pawoon: false },
  
  { group: 'Payment', name: 'Integrated QRIS/E-wallet', genfity: true, moka: true, majoo: true, pawoon: true },
  { group: 'Payment', name: 'Split Bill', genfity: true, moka: true, majoo: true, pawoon: true },
];

export default function ComparePage() {
  return (
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Kenapa Memilih Genfity?</h1>
          <p className="text-xl text-gray-500">
            Lihat bagaimana Genfity memberikan nilai lebih untuk bisnis F&B Anda dibandingkan solusi lain.
          </p>
        </div>

        <div className="overflow-x-auto pb-12">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 bg-white sticky left-0 z-10 w-1/4 min-w-[200px]"></th>
                {COMPETITORS.map((comp, i) => (
                  <th key={comp} className={`p-6 text-center min-w-[150px] ${i === 0 ? 'bg-brand-50 rounded-t-xl border-t-2 border-x-2 border-brand-500' : ''}`}>
                    <div className={`text-xl font-bold ${i === 0 ? 'text-brand-600' : 'text-gray-900'}`}>{comp}</div>
                    {i === 0 && <div className="text-xs font-semibold text-brand-500 uppercase tracking-wider mt-1">Pilihan Cerdas</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FEATURES.map((feature, idx) => (
                <tr key={feature.name} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 sticky left-0 bg-white z-10 font-medium text-gray-900 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {feature.name}
                    <div className="text-xs text-gray-400 font-normal mt-0.5">{feature.group}</div>
                  </td>
                  <td className="p-4 text-center bg-brand-50/30 border-x border-brand-100">
                    {feature.genfity ? <Check className="w-6 h-6 text-brand-600 mx-auto" /> : <Minus className="w-6 h-6 text-gray-300 mx-auto" />}
                  </td>
                  <td className="p-4 text-center">
                    {feature.moka ? <Check className="w-5 h-5 text-gray-400 mx-auto" /> : <Minus className="w-5 h-5 text-gray-300 mx-auto" />}
                  </td>
                  <td className="p-4 text-center">
                    {feature.majoo ? <Check className="w-5 h-5 text-gray-400 mx-auto" /> : <Minus className="w-5 h-5 text-gray-300 mx-auto" />}
                  </td>
                  <td className="p-4 text-center">
                    {feature.pawoon ? <Check className="w-5 h-5 text-gray-400 mx-auto" /> : <Minus className="w-5 h-5 text-gray-300 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="p-4 sticky left-0 bg-white z-10"></td>
                <td className="p-4 text-center bg-brand-50/30 border-x border-b border-brand-100 rounded-b-xl">
                  <Link href="/admin/register" className="inline-block px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-md">
                    Coba Gratis
                  </Link>
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-100 rounded-lg p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
             <Check className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900">Disclaimer Perbandingan</h4>
            <p className="text-sm text-blue-800 mt-1">
              Data perbandingan di atas dikumpulkan dari informasi publik di website masing-masing penyedia layanan per Januari 2026. 
              Fitur dapat berubah sewaktu-waktu. Kami menyarankan Anda melakukan riset mandiri.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
