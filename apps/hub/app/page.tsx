import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function RootPage() {
  const cookieStore = cookies();
  const session = cookieStore.get('fc_session')?.value;
  
  // 認証済み（user または guest）→ /home
  if (session) {
    redirect('/home');
  } else {
    // 未認証 → /auth/login
    redirect('/auth/login');
  }
}