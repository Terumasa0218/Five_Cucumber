import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = headers().get("x-profile-gate") ?? "n/a";
  const hasProfile = cookies().get("hasProfile")?.value ?? null;
  
  return NextResponse.json(
    { gate, hasProfile },
    { 
      status: 200,
      headers: { "Cache-Control": "no-store" }
    }
  );
}
