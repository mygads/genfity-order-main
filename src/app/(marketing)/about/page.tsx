import Link from 'next/link';
import { ArrowRight, ExternalLink } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="bg-white py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Tentang Genfity Order</h1>
        <p className="text-xl text-gray-600 mb-12 leading-relaxed">
          Genfity Order adalah bagian dari ekosistem Genfity, platform teknologi yang memberdayakan bisnis modern untuk tumbuh tanpa batas.
        </p>
        
        <div className="p-8 bg-gray-50 rounded-2xl border border-gray-100 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Visi Kami</h2>
          <p className="text-gray-600 mb-0">
            Menjadi tulang punggung operasional jutaan UMKM kuliner di Indonesia melalui teknologi yang terjangkau, handal, dan mudah digunakan.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <p className="text-gray-500">Ingin mengenal perusahaan kami lebih jauh?</p>
          <a 
            href="https://genfity.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors"
          >
            Kunjungi Website Korporat
            <ExternalLink className="ml-2 w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
