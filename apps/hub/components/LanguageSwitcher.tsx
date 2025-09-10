'use client';
import { useEffect, useState } from 'react';

export default function LanguageSwitcher(){
  const [lang, setLang] = useState<'ja'|'en'>('ja');
  useEffect(()=>{
    const saved = (typeof window!=='undefined' && (localStorage.getItem('lang') as 'ja'|'en'|null)) || null;
    const init = saved ?? 'ja';
    setLang(init);
    if (typeof document!=='undefined') document.documentElement.lang = init;
  },[]);
  const toggle = ()=>{
    const next = lang==='ja'?'en':'ja';
    setLang(next);
    if (typeof document!=='undefined') document.documentElement.lang = next;
    if (typeof window!=='undefined') localStorage.setItem('lang', next);
  };
  return (
    <button onClick={toggle} title="Language" aria-label="toggle language"
      className="px-3 py-1.5 rounded-lg border hover:opacity-90"
      style={{borderColor:'var(--paper-edge)'}}>
      {lang==='ja' ? 'EN' : '日本語'}
    </button>
  );
}
