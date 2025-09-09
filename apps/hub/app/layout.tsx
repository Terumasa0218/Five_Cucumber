import "./globals.css";
import Link from "next/link";
import { AuthProvider } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="light">
      <AuthProvider>
        <body>
          <Header />
          {children}
        </body>
      </AuthProvider>
    </html>
  );
}
