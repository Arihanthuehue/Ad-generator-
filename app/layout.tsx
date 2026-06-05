import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Toast from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Pragya Ad — AI Ad Creative Generator',
  description: 'Generate professional ad creatives, copy, product photoshoots, and video ads with AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-[240px] min-h-screen p-8">
          {children}
        </main>
        <Toast />
      </body>
    </html>
  );
}
