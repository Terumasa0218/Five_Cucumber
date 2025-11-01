# Cursor での hasKV 診断手順

Cursor のターミナル／Run コマンドから、以下の手順で `hasKV` の値が正しく反映されているかを確認してください。

## 1. 実行環境での環境変数確認
1. 環境変数名を正しく指定できているかを確認します。
   ```bash
   env | rg -i 'haskv'
   ```
   - 何も出力されない場合は、環境変数が実行環境で見えていません（`hasKV: false` 相当）。
   - キー名の綴り（大文字小文字含む）に誤りがないか確認してください。

2. `.env` や `process.env` を参照するコードがある場合は、ビルド前に `.env` が読み込まれているかを確認します。
   - Next.js/Node.js の場合、`.env` ファイルの場所と `NEXT_PUBLIC_` 接頭辞の有無を再確認します。
   - Firebase Functions などのデプロイ環境では、`firebase functions:config:get` で現在の設定を確認し、`firebase functions:config:set` で更新してください。

## 2. Cursor の Run/Debug 実行での確認
1. Cursor の Run 構成に環境変数を明示的に設定します。
   - Run パネル > "Environment variables" に `hasKV=true` を追加します。
   - 実行結果で `process.env.hasKV` や `import.meta.env` などが期待通り `true` になっているかをログに出力して確認します。

2. もし Run 構成で環境変数が反映されない場合、`Cursor Settings > Runtime > Environment` で共有環境変数が設定されているかチェックします。

## 3. ビルド／デプロイ時の挙動確認
1. `pnpm run build` などのビルドコマンド実行前に、ターミナルで再度 `env | rg hasKV` を実行し、値が残っているかを確認します。
2. CI/CD での挙動確認には、ワークフロー内で
   ```bash
   echo "hasKV=$hasKV"
   ```
   を実行し、ログに値が残っているかを確認します。

## 4. 典型的なトラブルシューティング
- `.env` ファイルを追加／変更した後は Cursor を再読込するか、ターミナルを再起動して再読み込みさせます。
- VSCode 互換の `launch.json` を利用している場合、`envFile` と `env` が競合していないか確認します。
- Docker／Dev Container 内で実行している場合、`docker-compose.yml` の `environment:` セクションに値が設定されているか、`docker-compose config` で確認します。

## 5. hasKV の最終確認
1. アプリケーション内で `hasKV` を参照している箇所に、一時的なログを仕込みます。
   ```ts
   console.log('[diag] hasKV', process.env.hasKV);
   ```
2. ログが `true` なら `hasKV: true`（実行時に見えている）、`undefined` や `false` なら `hasKV: false`（実行時に見えていない）と判断します。

上記手順で原因を特定し、必要に応じて環境変数の設定を修正してください。
