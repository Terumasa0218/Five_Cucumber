import { NextResponse } from "next/server";
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = "force-dynamic";
export const revalidate = 0;

const COMMIT = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'local-dev';

export async function GET(req: Request) {
  const auth = await verifyAuth(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(
    { 
      ok: true, 
      ts: Date.now(),
      server: "five-cucumber-hub"
    }, 
    { 
      headers: { 
        "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "x-build": COMMIT
      }
    }
  );
}
