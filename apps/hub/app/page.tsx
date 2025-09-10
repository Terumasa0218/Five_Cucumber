import { redirect } from 'next/navigation';

export default function RootPage() {
  // ルート "/" は常に /home へリダイレクト
  redirect('/home');
}