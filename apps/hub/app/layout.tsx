import { AuthProvider } from "@/providers/AuthProvider";
import Header from "../components/Header";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="light">
      <AuthProvider>
        <body>
          <div className="bg-frame" aria-hidden="true" />
          {/* 浮遊ナビ（背景の空白域に左右配置） */}
        <Header />
          {children}
        </body>
      </AuthProvider>
    </html>
  );
}
