import { validateNickname } from "@/lib/nickname.shared";
import { NextResponse } from "next/server";

const BASE = process.env.UPSTASH_REDIS_REST_URL!;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
function hasKV() { return !!(BASE && TOKEN); }

async function setNX(key: string, value: string, ttlSec: number) {
  // Upstash REST: SET key value NX EX ttl
  const url = `${BASE}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?NX=1&EX=${ttlSec}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    cache: "no-store",
  });
  const data = await res.json(); // { result: "OK" | null }
  return data?.result === "OK";  // OKなら新規作成、nullなら既存=duplicate
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const r = validateNickname(name);
    if (!r.ok) {
      const status = r.reason === "length" ? 400 : 422;
      return NextResponse.json({ ok:false, reason:r.reason }, { status });
    }
    const nickname = r.value;
    const key = `fc:nick:${nickname}`; // 正規化後の文字列をそのままキーに

    // ❶ 永続・原子的に重複チェック
    if (hasKV()) {
      const created = await setNX(key, String(Date.now()), 60 * 60 * 24 * 365);
      if (!created) {
        return NextResponse.json({ ok:false, reason:"duplicate" }, { status:409 });
      }
    } else {
      // フォールバック（開発時のみ）：インメモリSet
      const names = (globalThis as any).__FC_NAMES__ ?? new Set<string>();
      (globalThis as any).__FC_NAMES__ = names;
      if (names.has(nickname)) {
        return NextResponse.json({ ok:false, reason:"duplicate" }, { status:409 });
      }
      names.add(nickname);
    }

    // ❷ Cookie をサーバ側で確実に付与
    const res = NextResponse.json({ ok:true, nickname });
    const gid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookies.set("guestId", gid, { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.cookies.set("hasProfile", "1", { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.cookies.set("nickname", nickname, { path:"/", maxAge:60*60*24*180, sameSite:"lax", secure:true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e:any) {
    return NextResponse.json(
      { ok:false, reason:"server", error:String(e?.message ?? e) },
      { status:500, headers:{ "Cache-Control":"no-store" } }
    );
  }
}