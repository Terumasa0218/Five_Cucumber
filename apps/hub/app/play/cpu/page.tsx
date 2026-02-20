import { redirect } from 'next/navigation';

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LegacyCpuPlayPage({ searchParams }: Props) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === 'string') {
      query.set(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(key, item);
      }
    }
  }

  const queryString = query.toString();
  redirect(queryString ? `/cucumber/cpu/play?${queryString}` : '/cucumber/cpu/play');
}
