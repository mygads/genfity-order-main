'use client';

import Link from 'next/link';
import Image from 'next/image';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube, 
  Linkedin,
  MapPin,
  Mail,
  Phone
} from 'lucide-react';

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'POS Core', href: '/products/pos-core' },
      { name: 'POS Mobile', href: '/products/pos-mobile' },
      { name: 'Consumer (QR Ordering)', href: '/products/consumer' },
      { name: 'Genfity Pay', href: '/products/pay' },
      { name: 'Sales AI', href: '/products/sales-ai' },
      { name: 'Pricing', href: '/pricing' },
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Careers', href: 'https://genfity.com/careers' },
      { name: 'Blog', href: 'https://genfity.com/blog' },
      { name: 'Partner Program', href: '/influencer-program' },
      { name: 'Contact', href: '/help' },
    ],
    support: [
      { name: 'Help Center', href: '/help' },
      { name: 'System Status', href: 'https://status.genfity.com' },
      { name: 'Terms of Service', href: '/terms-of-service' },
      { name: 'Privacy Policy', href: '/privacy-policy' },
    ]
  };

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="relative h-10 w-32 mb-6">
              <Image
                src="/images/logo/logo.png"
                alt="Genfity Order"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-sm">
              Modular ERP, ordering, payments, loyalty and AI sales platform for F&B, retail and service businesses.
              Scale your operations, boost revenue, and build customer loyalty — all on one intelligent commerce platform.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-2 bg-gray-50 rounded-full text-gray-500 hover:bg-brand-50 hover:text-brand-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Products</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-brand-600 transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-brand-500 shrink-0 mt-0.5" />
                <span className="text-sm text-gray-500">
                  Jakarta, Indonesia
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-brand-500 shrink-0" />
                <a href="mailto:hello@genfity.com" className="text-sm text-gray-500 hover:text-brand-600">
                  hello@genfity.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-brand-500 shrink-0" />
                <span className="text-sm text-gray-500">
                  +62 812-3456-7890
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © {currentYear} Genfity Platform. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-sm text-gray-400 hover:text-gray-600">Privacy Policy</Link>
            <Link href="/terms-of-service" className="text-sm text-gray-400 hover:text-gray-600">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
