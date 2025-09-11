import { NextResponse } from "next/server";
import { validateNickname } from "@/lib/nickname";

// すぐ動く重複チェック（デプロイ中のプロセスで共有）
const globalNames = (globalThis as any).__FC_NAMES__ ?? new Set<string>();
(globalThis as any).__FC_NAMES__ = globalNames;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    const r = validateNickname(name);
    if (!r.ok) {
      const status = r.reason === "length" ? 400 : 422;
      return NextResponse.json({ ok: false, reason: r.reason }, { status });
    }

    const nickname = r.value;

    // 重複チェック（最小実装）
    if (globalNames.has(nickname)) {
      return NextResponse.json({ ok: false, reason: "duplicate" }, { status: 409 });
    }
    globalNames.add(nickname);

    // レスポンス作成 & サーバ側で Cookie を確実に付与
    const res = NextResponse.json({ ok: true });
    // guestId は既存があれば流用、なければ新規発行
    const gid =
      // @ts-ignore ルート関数内の request の Cookie は Response で設定する
      crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);

    res.cookies.set("guestId", gid, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      secure: true,
    });
    res.cookies.set("hasProfile", "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      secure: true,
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    // 失敗理由を確実に返す（モバイルでも分かる）
    return NextResponse.json(
      { ok: false, reason: "server", error: String(e?.message ?? e) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}