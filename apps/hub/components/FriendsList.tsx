'use client';
import { useEffect, useState } from 'react';
import { getFirebaseClient } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

type Friend = { uid:string; name:string };

export default function FriendsList(){
  const [uid, setUid] = useState<string|null>(null);
  const [list, setList] = useState<Friend[]>([]);
  
  useEffect(() => {
    const fb = getFirebaseClient();
    if (!fb) return;
    return fb.auth.onAuthStateChanged(u => setUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    const fb = getFirebaseClient();
    if (!fb || !uid) { 
      setList([]); 
      return; 
    }
    
    try {
      const db = fb.db;
      const ref = collection(db, 'users', uid, 'friends');
      return onSnapshot(ref, snap => {
        const arr: Friend[] = [];
        snap.forEach(d => arr.push({ uid: d.id, ...(d.data() as any) }));
        setList(arr);
      });
    } catch (e) {
      console.warn('friends collection missing. TODO: create schema', e);
      setList([]);
    }
  }, [uid]);

  if(!(getFirebaseClient()?.auth.currentUser)){
    return <p className="opacity-80" style={{color:'var(--ink)'}}>ログインするとフレンド一覧が表示されます。</p>;
  }
  if(list.length===0){
    return <p className="opacity-80" style={{color:'var(--ink)'}}>フレンドがいません。プロフィールから追加してください。</p>;
  }
  return (
    <div>
      <h3 className="text-lg mb-2" style={{color:'var(--cuke)'}}>フレンド</h3>
      <ul className="space-y-2">
        {list.map(f=>(
          <li key={f.uid} className="flex items-center justify-between">
            <span>{f.name ?? f.uid}</span>
            {/* TODO: クリックで招待/DM など */}
          </li>
        ))}
      </ul>
    </div>
  );
}
