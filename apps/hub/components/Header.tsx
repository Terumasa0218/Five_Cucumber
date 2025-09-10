'use client';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '../lib/firebase';

export default function Header(){
  return (
    <header
      className="sticky top-0 z-10 h-16 border-b"
      /* 透けをやめて、下の背景絵の影響を受けない帯にする */
      style={{ borderColor:'var(--paper-edge)', background:'var(--paper)' }}
    >
      {/* 中央に1本のナビだけ置く */}
      <div className="mx-auto h-full w-full max-w-6xl px-6 md:px-10 flex items-center justify-center">
        <nav className="flex items-center gap-8 md:gap-10">
          <Link href="/home" className="link-reset hover:opacity-80">ホーム</Link>
          <Link href="/auth/login" className="link-reset hover:opacity-80">ゲスト</Link>
          <button
            onClick={()=>signOut(auth)}
            className="px-3 py-1.5 rounded-lg border hover:opacity-90"
            style={{borderColor:'var(--paper-edge)'}}
          >
            サインアウト
          </button>
        </nav>
      </div>
    </header>
  );
}