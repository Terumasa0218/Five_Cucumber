'use client';
import { useEffect, useState } from 'react';

export default function ThemeSwitcher(){
  const [theme, setTheme] = useState<'light'|'dark'>('light');
  useEffect(()=>{
    const saved = (typeof window!=='undefined' && (localStorage.getItem('theme') as 'light'|'dark'|null)) || null;
    const init = saved ?? 'light';
    setTheme(init);
    if (typeof document!=='undefined') document.documentElement.dataset.theme = init;
  },[]);
  const toggle = ()=>{
    const next = theme==='light'?'dark':'light';
    setTheme(next);
    if (typeof document!=='undefined') document.documentElement.dataset.theme = next;
    if (typeof window!=='undefined') localStorage.setItem('theme', next);
  };
  return (
    <button onClick={toggle} title="Theme" aria-label="toggle theme"
      className="px-3 py-1.5 rounded-lg border hover:opacity-90"
      style={{borderColor:'var(--paper-edge)'}}>
      {theme==='light' ? 'Dark' : 'Light'}
    </button>
  );
}
