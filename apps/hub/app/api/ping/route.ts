import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { 
      ok: true, 
      ts: Date.now(),
      server: "five-cucumber-hub"
    }, 
    { 
      headers: { 
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
