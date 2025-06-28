import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { InAppNotifier } from '@/components/shared/InAppNotifier';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <InAppNotifier />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
