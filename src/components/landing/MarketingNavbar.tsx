'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Menu, 
  X, 
  QrCode, 
  Monitor, 
  Smartphone, 
  Server, 
  Tablet, 
  Tv, 
  CalendarClock, 
  Armchair, 
  Box, 
  BookOpen, 
  Ticket, 
  Users, 
  BarChart3 
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, if not I'll use simple class combination

// Mega Menu Data
const PRE_FEATURES = [
  {
    title: 'Produk Utama',
    items: [
      { name: 'QR Ordering', href: '/products/qr-ordering', desc: 'Pesan & bayar dari meja tanpa antri', icon: QrCode },
      { name: 'POS / Kasir', href: '/products/pos', desc: 'Sistem kasir cloud terintegrasi', icon: Monitor },
      { name: 'Mobile POS', href: '/products/mobile-pos', desc: 'Terima pesanan di mana saja', icon: Smartphone },
      { name: 'Kitchen Display', href: '/products/kds', desc: 'Manajemen pesanan dapur efisien', icon: Server },
      { name: 'PDA Order', href: '/products/pda', desc: 'Perangkat khusus untuk waiter', icon: Tablet },
      { name: 'Customer Display', href: '/products/customer-display', desc: 'Layar kedua untuk pelanggan', icon: Tv },
    ]
  },
  {
    title: 'Fitur Pendukung',
    items: [
      { name: 'Scheduled Order', href: '/products/scheduled-order', desc: 'Pesan sekarang, ambil nanti', icon: CalendarClock },
      { name: 'Table Management', href: '/features#table', desc: 'Atur denah meja & reservasi', icon: Armchair },
      { name: 'Inventory', href: '/features#inventory', desc: 'Stok bahan & resep akurat', icon: Box },
      { name: 'Menu Management', href: '/features#menu', desc: 'Atur varian & harga dinamis', icon: BookOpen },
      { name: 'Promo & Voucher', href: '/features#promo', desc: 'Diskon otomatis & loyalitas', icon: Ticket },
      { name: 'Loyalty & Referral', href: '/features#loyalty', desc: 'Retensi pelanggan & poin', icon: Users },
      { name: 'Reporting', href: '/features#reporting', desc: 'Analisa bisnis real-time', icon: BarChart3 },
    ]
  }
];

export default function MarketingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveMenu(null);
  }, [pathname]);

  const navLinks = [
    { name: 'Produk & Fitur', key: 'products', hasMegaMenu: true },
    { name: 'Solusi', href: '/solutions/fnb' },
    { name: 'Harga', href: '/pricing' },
    { name: 'Program Influencer', href: '/influencer-program' },
    { name: 'Tentang Genfity', href: '/about' },
    { name: 'Bantuan', href: '/help' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b ${
        isScrolled || mobileMenuOpen
          ? 'bg-white border-gray-200 shadow-sm'
          : 'bg-white/90 backdrop-blur-md border-transparent'
      }`}
      onMouseLeave={() => setActiveMenu(null)}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="shrink-0 flex items-center z-50">
            <div className="relative h-10 w-32 md:w-36">
              <Image
                src="/images/logo/logo.png"
                alt="Genfity Order"
                width={144}
                height={40}
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group h-20 flex items-center">
                {link.hasMegaMenu ? (
                  <button
                    className="flex items-center text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors gap-1 outline-none"
                    onMouseEnter={() => setActiveMenu(link.key)}
                    onClick={() => setActiveMenu(activeMenu === link.key ? null : link.key)}
                  >
                    {link.name}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeMenu === link.key ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <Link
                    href={link.href!}
                    className="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors"
                    onMouseEnter={() => setActiveMenu(null)}
                  >
                    {link.name}
                  </Link>
                )}

                {/* Mega Menu Dropdown */}
                {link.hasMegaMenu && activeMenu === link.key && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 w-[800px] bg-white rounded-xl shadow-xl border border-gray-100 p-6 grid grid-cols-2 gap-8 cursor-default"
                    style={{ marginTop: '1px' }} /* Align with bottom of nav */
                    onMouseEnter={() => setActiveMenu(link.key)}
                    onMouseLeave={() => setActiveMenu(null)}
                  >
                    {/* Main Products */}
                    <div>
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        {PRE_FEATURES[0].title}
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {PRE_FEATURES[0].items.map((item) => (
                          <Link 
                            key={item.name} 
                            href={item.href}
                            className="group/item flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="mt-1 p-2 bg-brand-50 text-brand-600 rounded-lg group-hover/item:bg-white group-hover/item:shadow-sm transition-all">
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900 group-hover/item:text-brand-600">
                                {item.name}
                              </div>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Supporting Features */}
                    <div className="bg-gray-50/50 -m-6 p-6 border-l border-gray-100">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                        {PRE_FEATURES[1].title}
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {PRE_FEATURES[1].items.map((item) => (
                          <Link 
                            key={item.name} 
                            href={item.href}
                            className="group/item flex items-center gap-3 p-2 rounded-md hover:bg-white hover:shadow-sm transition-all"
                          >
                            <item.icon className="w-4 h-4 text-gray-500 group-hover/item:text-brand-600" />
                            <div className="text-sm text-gray-700 font-medium group-hover/item:text-gray-900">
                              {item.name}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </div>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            <Link 
              href="/admin/login" 
              className="text-sm font-medium text-gray-700 hover:text-brand-600 px-4 py-2"
            >
              Masuk
            </Link>
            <Link 
              href="/admin/register" 
              className="text-sm font-medium text-gray-700 hover:text-brand-600 px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-all"
            >
              Daftar
            </Link>
            <Link 
              href="/schedule-demo" 
              className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-6 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg transform active:scale-95"
            >
              Jadwalkan Demo
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center z-50">
             <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden fixed inset-0 top-20 bg-white z-40 overflow-y-auto pb-24"
          >
            <div className="p-4 space-y-6">
              {navLinks.map((link) => (
                <div key={link.name} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  {link.hasMegaMenu ? (
                    <div className="space-y-4">
                      <div className="font-semibold text-lg text-gray-900">{link.name}</div>
                      <div className="grid grid-cols-1 gap-4 pl-4">
                        {PRE_FEATURES[0].items.map(item => (
                          <Link 
                            key={item.name} 
                            href={item.href}
                            className="flex items-center gap-3 text-gray-600"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <item.icon className="w-5 h-5 text-brand-500" />
                            <span className="text-sm font-medium">{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={link.href!}
                      className="block text-lg font-medium text-gray-700 hover:text-brand-600"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-3 pt-6">
                <Link 
                  href="/admin/login" 
                  className="w-full text-center py-3 border border-gray-200 rounded-lg text-gray-700 font-medium"
                >
                  Masuk
                </Link>
                <Link 
                  href="/schedule-demo" 
                  className="w-full text-center py-3 bg-brand-600 text-white rounded-lg font-medium shadow-md"
                >
                  Jadwalkan Demo
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
