import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" data-theme="light">
      <body>
        <header className="h-16 flex items-center justify-between px-4 border-b" style={{borderColor:"var(--paper-edge)"}}>
          <Link href="/home" className="text-lg" style={{color:"var(--ink)"}}>Game Hub</Link>
          <nav className="flex items-center gap-3">
            <Link href="/home" className="underline">ホーム</Link>
            <Link href="/auth/login" className="rounded-lg px-3 py-2 border" style={{borderColor:"var(--paper-edge)"}}>
              ログイン
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
