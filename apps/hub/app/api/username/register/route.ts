import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateNickname } from "@/lib/nickname";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ ok:false, reason:"length" }, { status:400 });
    }
    
    const v = validateNickname(name);
    if (!v.ok) {
      const status = v.reason === "length" ? 400 : 422;
      return NextResponse.json({ ok:false, reason:v.reason }, { status });
    }

    const store = getStore();
    const exists = await store.exists(v.value);
    
    if (exists) {
      return NextResponse.json({ ok:false, reason:"duplicate" }, { status:409 });
    }
    
    await store.save(v.value);

    const res = NextResponse.json({ ok:true });
    const jar = cookies();
    const gid = jar.get("guestId")?.value ?? crypto.randomUUID();
    res.cookies.set("guestId", gid, { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.cookies.set("hasProfile", "1", { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("[register] error", e);
    return NextResponse.json({ 
      ok:false, 
      reason:"server",
      error: e instanceof Error ? e.message : 'Unknown error'
    }, { status:500, headers:{ "Cache-Control":"no-store" } });
  }
}