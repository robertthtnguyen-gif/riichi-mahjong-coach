import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Riichi Mahjong Coach',
  description: 'A coaching assistant for Riichi Mahjong players',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
