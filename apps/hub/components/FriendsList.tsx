'use client';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
// Firestore 読み取り（存在しない場合は TODO コメント）
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';

type Friend = { uid:string; name:string };

export default function FriendsList(){
  const [uid, setUid] = useState<string|null>(null);
  const [list, setList] = useState<Friend[]>([]);
  useEffect(()=> onAuthStateChanged(auth, u=> setUid(u?.uid ?? null)), []);

  useEffect(()=>{
    if(!uid){ setList([]); return; }
    try{
      const db = getFirestore();
      const ref = collection(db, 'users', uid, 'friends');
      return onSnapshot(ref, snap=>{
        const arr:Friend[] = [];
        snap.forEach(d=>arr.push({uid:d.id, ...(d.data() as any)}));
        setList(arr);
      });
    }catch(e){
      console.warn('friends collection missing. TODO: create schema', e);
    }
  },[uid]);

  if(!uid){
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
