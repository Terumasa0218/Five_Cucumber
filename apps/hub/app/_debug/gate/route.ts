import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = headers().get('x-profile-gate') ?? 'n/a';

  return NextResponse.json(
    { gate },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
