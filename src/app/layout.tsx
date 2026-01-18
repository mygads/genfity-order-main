import { Outfit } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CartProvider } from '@/context/CartContext';
import { CustomerLanguageProvider } from '@/context/LanguageContext';
import { Metadata } from 'next';

const outfit = Outfit({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Genfity - Online Ordering',
  description: 'Order food online from your favorite restaurants',
  icons: {
    icon: '/images/logo/favicon.ico',
    apple: '/images/logo/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <CustomerLanguageProvider merchantCurrency={null}>
            <SidebarProvider>
              <CartProvider>
                {children}
              </CartProvider>
            </SidebarProvider>
          </CustomerLanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
