'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="loading">
      <p>Redirecting to home...</p>
    </div>
  );
}
