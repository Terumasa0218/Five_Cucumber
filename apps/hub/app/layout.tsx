import type { Metadata } from 'next';
import Header from "../components/Header";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://five-cucumber-hub.vercel.app'),
  title: {
    default: 'Five Cucumber – 5本のきゅうり',
    template: '%s | Five Cucumber'
  },
  description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。CPU対戦、フレンド対戦に対応。',
  applicationName: 'Five Cucumber',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png'
  },
  openGraph: {
    title: 'Five Cucumber – 5本のきゅうり',
    description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。',
    siteName: 'Five Cucumber',
    type: 'website',
    locale: 'ja_JP',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Five Cucumber – 5本のきゅうり'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Five Cucumber – 5本のきゅうり',
    description: '5本のきゅうりを避ける戦略カードゲーム。2-6人でプレイ可能。',
    images: ['/og-image.png']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="light">
      <body>
        {/* 浮遊ナビ（背景の空白域に左右配置） */}
        <Header />
        {children}
      </body>
    </html>
  );
}
