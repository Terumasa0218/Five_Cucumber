import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default function RootPage() {
  const cookieStore = cookies();
  const authToken = cookieStore.get('fc_session')?.value;
  
  if (authToken) {
    redirect('/home');
  } else {
    redirect('/auth/login');
  }
}