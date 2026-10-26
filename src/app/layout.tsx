import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://santhaya.local'),
  title: 'Santhaya Associates Pvt. Ltd. | Construction Tenders & Machinery Supply',
  description:
    'Santhaya Associates Pvt. Ltd. — Specialized partner for government and private construction tenders, heavy construction machinery supply, and manufacturing machinery equipment. Building Today. Powering Tomorrow.',
  keywords: [
    'Santhaya Associates',
    'Construction tenders',
    'Government tenders India',
    'Private construction tenders',
    'Construction machinery supply',
    'Manufacturing machinery supply',
    'Heavy equipment quotation',
  ],
  icons: {
    icon: '/santhaya-symbol.png',
    shortcut: '/santhaya-symbol.png',
    apple: '/santhaya-symbol.png',
  },
  openGraph: {
    title: 'Santhaya Associates Pvt. Ltd.',
    description:
      'Building Today. Powering Tomorrow. Government & Private Construction Tenders, Construction Machinery Supply, and Manufacturing Machinery Supply.',
    images: [
      {
        url: '/full-brand-reference.png',
        width: 1254,
        height: 1254,
        alt: 'Santhaya Associates Pvt. Ltd. Brand Reference',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-800 antialiased selection:bg-gold-500 selection:text-navy-950">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
