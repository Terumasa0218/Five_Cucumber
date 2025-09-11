import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateNickname } from "@/lib/nickname";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    console.log('[api/register] Received name:', name);
    
    const v = validateNickname(name);
    console.log('[api/register] Validation result:', v);
    
    if (!v.ok) {
      const status = v.reason === "length" ? 400 : 422;
      console.log('[api/register] Validation failed:', v.reason, 'status:', status);
      return NextResponse.json({ ok:false, reason:v.reason }, { status });
    }

    const store = getStore();
    console.log('[api/register] Using store type:', (store as any).__type);
    
    const exists = await store.exists(v.value);
    console.log('[api/register] Name exists check:', v.value, '→', exists);
    
    if (exists) {
      console.log('[api/register] Duplicate name detected:', v.value);
      return NextResponse.json({ ok:false, reason:"duplicate" }, { status:409 });
    }
    
    await store.save(v.value);
    console.log('[api/register] Name saved successfully:', v.value);

    const res = NextResponse.json({ ok:true, store: (store as any).__type });
    const jar = cookies();
    const gid = jar.get("guestId")?.value ?? crypto.randomUUID();
    res.cookies.set("guestId", gid, { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.cookies.set("hasProfile", "1", { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("[register] error", e);
    return NextResponse.json({ ok:false, reason:"server" }, { status:500, headers:{ "Cache-Control":"no-store" } });
  }
}