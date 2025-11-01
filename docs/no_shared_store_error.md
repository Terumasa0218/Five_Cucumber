# `no-shared-store` エラーの原因と診断手順

フレンド対戦の部屋作成 API (`/api/friend/create`) から
`{ ok: false, reason: 'no-shared-store' }` が返る場合、
サーバー側で共有ストレージ（Vercel KV / Redis 系）が検出できていません。

## 原因
- `KV_REST_API_URL` と `KV_REST_API_TOKEN`（もしくは `VERCEL_REDIS_URL` と `VERCEL_REDIS_TOKEN`）が実行時環境に設定されていない
- 秘密変数を Vercel プロジェクトに追加したが、デプロイ対象（Production / Preview / Development）に反映していない
- Vercel KV の Integration を追加しただけで、Environment Variables の "Add" ボタンを押していない
- Upstash Redis の URL / Token を Preview にコピーし忘れている

Firestore の資格情報が揃っていても、共有ストアが無い場合は同期戦を提供できないため `503 no-shared-store` で遮断します。

## まず確認すること
1. `https://<デプロイ先>/api/_diag/shared-store` にアクセスし、`hasKV` などの真偽値を確認する
   - すべて `false` ならサーバーから共有ストアの環境変数が見えていません
2. Vercel の Dashboard > Project > Settings > Environment Variables で、対象ブランチの KV 関連変数が存在するか確認
3. 変数を追加・修正したら "Redeploy" または `vercel deploy` を実行して反映する

## 追加診断 (`scripts/check-store.mjs`)
```
BASE_URL=https://five-cucumber-hub.vercel.app pnpm --filter hub exec node ../../scripts/check-store.mjs
```
- `❌ 503 no-shared-store` と表示された場合、続けて `api/_diag/shared-store` を確認する

## API レスポンスの `detail`
`friend/create` API は、共有ストレージが検出できないときに `detail` に診断情報を含めるようになりました。
例:
```json
{
  "ok": false,
  "reason": "no-shared-store",
  "detail": {
    "sharedConfigured": false,
    "sharedAvailable": false,
    "allowMemoryFallback": false,
    "flags": {
      "kv": false,
      "upstash": false,
      "vercelRedis": false,
      "redisTcp": false
    }
  }
}
```
これにより、どの環境変数が欠けているかをフロントエンドから即座に判断できます。

## Vercel KV の設定チェックリスト
- [ ] Vercel Dashboard の Integrations > KV で "Connect" まで完了しているか
- [ ] プロジェクト Settings > Environment Variables に `KV_REST_API_URL` と `KV_REST_API_TOKEN` が存在するか
- [ ] Preview / Production の両方に変数をコピーしたか
- [ ] 追加後に再デプロイしたか（古いビルドは変数を取り込まない）
- [ ] Secret を更新した場合は "Redeploy" で即時反映したか

## よくある落とし穴
- `.env.local` にだけ設定していて Vercel にアップロードしていない
- `KV_URL` だけを設定し、REST API 用の URL/TOKEN を忘れている
- Preview 環境へコピーする際に `KV_REST_API_TOKEN` を Read-Only Token と取り違えている

これらを確認することで、`hasKV` の診断と `no-shared-store` エラーの原因特定が容易になります。
