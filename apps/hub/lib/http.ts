import { NextResponse } from 'next/server';

export function json(data: any, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}


