import { redirect } from 'next/navigation';

type LegacyLobbyPageProps = {
  params: { gameId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function LegacyLobbyPage({ params, searchParams }: LegacyLobbyPageProps) {
  if (params.gameId !== 'cucumber5') {
    redirect('/home');
  }

  const mode = firstSearchValue(searchParams?.mode);

  if (mode === 'friends') {
    redirect('/friend');
  }

  if (mode === 'cpu') {
    redirect('/cucumber/cpu/settings');
  }

  redirect('/online');
}
