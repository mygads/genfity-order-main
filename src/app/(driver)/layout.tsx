'use client';

import { DriverLanguageProvider } from '@/context/LanguageContext';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DriverLanguageProvider>{children}</DriverLanguageProvider>;
}
