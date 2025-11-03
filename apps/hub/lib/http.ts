import { NextResponse } from 'next/server';

export function json<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}


