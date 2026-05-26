import { redirect } from 'next/navigation';

type LegacyPlayPageProps = {
  params: { gameId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function appendLegacyPlaySearchParams(
  path: string,
  searchParams?: LegacyPlayPageProps['searchParams'],
) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) {
      continue;
    }

    const targetKey = key === 'difficulty' ? 'cpuLevel' : key;

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(targetKey, item);
      }
      continue;
    }

    query.set(targetKey, value);
  }

  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export default function LegacyPlayPage({ params, searchParams }: LegacyPlayPageProps) {
  if (params.gameId === 'cucumber5') {
    redirect(appendLegacyPlaySearchParams('/cucumber/cpu/play', searchParams));
  }

  redirect('/home');
}
