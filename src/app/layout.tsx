import { Outfit, Inter } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { CartProvider } from "@/context/CartContext";
import { Metadata } from 'next';

const outfit = Outfit({
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter',
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
      <body className={`${outfit.className} ${inter.variable} dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
