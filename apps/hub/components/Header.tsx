'use client';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '../lib/firebase';

export default function Header(){
  return (
    <header
      className="sticky top-0 z-10 h-16 border-b backdrop-blur-sm"
      style={{borderColor:'var(--paper-edge)', background:'color-mix(in oklab, var(--paper) 86%, transparent)'}}
    >
      <div className="mx-auto h-full w-full max-w-6xl px-6 md:px-10 flex items-center justify-between">
        <nav className="flex items-center gap-8">
          <Link href="/home" className="no-underline hover:opacity-80 link-reset">ホーム</Link>
        </nav>
        <nav className="flex items-center gap-8 md:gap-10">
          <Link href="/auth/login" className="no-underline hover:opacity-80 link-reset">ゲスト</Link>
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