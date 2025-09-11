import { NextResponse } from "next/server";
import { validateNickname } from "@/lib/nickname.shared";

// まずは最小の重複チェック（デプロイ中のプロセス内で共有）
const names = (globalThis as any).__FC_NAMES__ ?? new Set<string>();
(globalThis as any).__FC_NAMES__ = names;

export const runtime = "nodejs";        // Nodeで安定
export const dynamic = "force-dynamic"; // キャッシュ無効

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const r = validateNickname(name);
    if (!r.ok) {
      const status = r.reason === "length" ? 400 : 422;
      return NextResponse.json({ ok:false, reason:r.reason }, { status });
    }
    const nickname = r.value;

    if (names.has(nickname)) {
      return NextResponse.json({ ok:false, reason:"duplicate" }, { status:409 });
    }
    names.add(nickname);

    const res = NextResponse.json({ ok:true });
    // ここはブラウザ依存せずにCookie設定（iOSでもOK）
    const gid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    res.cookies.set("guestId", gid, {
      path: "/", maxAge: 60*60*24*180, sameSite: "lax", secure: true
    });
    res.cookies.set("hasProfile", "1", {
      path: "/", maxAge: 60*60*24*180, sameSite: "lax", secure: true
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e:any) {
    return NextResponse.json(
      { ok:false, reason:"server", error: String(e?.message ?? e) },
      { status:500, headers:{ "Cache-Control":"no-store" } }
    );
  }
}