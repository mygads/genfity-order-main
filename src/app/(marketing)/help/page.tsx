import { Mail, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Pusat Bantuan</h1>
          <p className="text-xl text-gray-600">
            Butuh bantuan teknis atau info produk? Tim kami siap membantu 24/7.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            { icon: MessageCircle, title: 'Chat WhatsApp', value: '+62 812-3456-7890', link: 'https://wa.me/6281234567890' },
            { icon: Mail, title: 'Email Support', value: 'support@genfity.com', link: 'mailto:support@genfity.com' },
            { icon: Phone, title: 'Call Center', value: '021-1234-5678', link: 'tel:02112345678' }
          ].map((contact) => (
            <a key={contact.title} href={contact.link} className="flex flex-col items-center p-8 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all group">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 group-hover:bg-brand-50 transition-colors">
                <contact.icon className="w-8 h-8 text-gray-400 group-hover:text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{contact.title}</h3>
              <p className="text-brand-600 font-medium">{contact.value}</p>
            </a>
          ))}
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 pl-4 border-l-4 border-brand-500">FAQ Populer</h2>
          <div className="space-y-4">
            {[
              'Bagaimana cara install aplikasi kasir?',
              'Printer apa saja yang kompatibel?',
              'Apakah bisa import data menu dari Excel?',
              'Bagaimana refund pesanan yang salah?'
            ].map((q) => (
              <details key={q} className="group border rounded-lg p-4 cursor-pointer [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between font-medium text-gray-800 hover:text-brand-600">
                  {q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-gray-600 text-sm leading-relaxed">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Detail teknis akan dijelaskan di sini dengan link ke dokumentasi lengkap.
                </p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
             <a href="#" className="text-brand-600 font-medium hover:underline">Lihat semua artikel bantuan &rarr;</a>
          </div>
        </div>

      </div>
    </div>
  );
}
