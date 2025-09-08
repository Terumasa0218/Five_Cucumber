import { Header } from '@/components/Header';
import { AuthProvider } from '@/providers/AuthProvider';
import { I18nProvider } from '@/providers/I18nProvider';
import { MetricsProvider } from '@/providers/MetricsProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import '@five-cucumber/ui/src/theme.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Five Cucumber - 遊び大全',
  description: 'Multi-game web application featuring Five Cucumbers card game',
  keywords: ['card game', 'five cucumbers', 'multiplayer', 'online gaming'],
  authors: [{ name: 'Five Cucumber Team' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <MetricsProvider>
                <div className="app">
                  <Header />
                  <main className="main">
                    {children}
                  </main>
                </div>
              </MetricsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
