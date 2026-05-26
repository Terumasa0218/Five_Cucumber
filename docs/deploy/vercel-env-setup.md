# Vercel環境変数設定ガイド

## 必要な環境変数

### 本番環境で設定すべき変数

| 変数名 | 値 | 説明 |
|--------|-----|------|
| `NEXT_PUBLIC_APP_ORIGIN` | `https://five-cucumber-hub.vercel.app` | アプリのベースURL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `your-api-key` | Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `your-project-id` | Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `your-app-id` | Firebase App ID |
| `FIREBASE_PROJECT_ID` | `your-project-id` | API token verification for server sync |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...` | API token verification for server sync |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----...` | API token verification for server sync |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV or compatible values | Shared friend-room state |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis values | Shared friend-room state fallback |
| `NEXT_PUBLIC_HAS_SHARED_STORE` | `true` | Enable server-backed friend-room flow |
| `NEXT_PUBLIC_USE_SERVER` | `true` | Enable server-backed friend-room flow |
| `ABLY_API_KEY` | Ably key | Optional room update acceleration |

## Vercelでの設定手順

### 1. ダッシュボードにアクセス

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 対象プロジェクト `five-cucumber-hub` を選択

### 2. 環境変数を追加

1. **「Settings」** タブをクリック
2. 左メニューから **「Environment Variables」** を選択
3. **「Add New」** をクリック

### 3. 各変数を設定

#### NEXT_PUBLIC_APP_ORIGIN
- **Name**: `NEXT_PUBLIC_APP_ORIGIN`
- **Value**: `https://five-cucumber-hub.vercel.app`
- **Environment**: `Production` (必要に応じて `Preview` も)

#### Firebase設定
- **Name**: `NEXT_PUBLIC_FIREBASE_API_KEY`
- **Value**: Firebase コンソールから取得したAPI Key
- **Environment**: `Production`

（他のFirebase変数も同様に設定）

### 4. 設定の確認

1. すべての変数が追加されたことを確認
2. **「Redeploy」** をクリックして再デプロイ
3. デプロイ完了後、アプリケーションの動作を確認

## ローカル開発環境

### .env.local ファイル

```env
# ローカル開発用
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000

# Firebase設定（本番と同じ値を使用）
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## 設定後の確認

### 1. 環境変数の確認

```bash
# ローカルで確認
pnpm -w dev

# ブラウザの開発者ツールで確認
console.log(process.env.NEXT_PUBLIC_APP_ORIGIN)
```

### 2. 現行MVPの動作確認

1. `/home` にアクセス
2. `/cucumber/cpu/settings` からCPU対戦を開始できることを確認
3. `/friend/create` と `/friend/join` で6桁ルームコードの作成・参加導線を確認
4. サーバー同期を使う場合、Firebase匿名認証と共有ストア設定が不足していないことを確認

## トラブルシューティング

### よくある問題

- **環境変数が反映されない**: 再デプロイが必要
- **認証エラー**: Firebase設定と環境変数の整合性を確認
- **CORS エラー**: 認証ドメインの設定を確認

### デバッグ方法

```bash
# 本番環境でのログ確認
vercel logs

# ローカル環境での確認
pnpm -w dev
```

## セキュリティ注意事項

- 環境変数は適切な権限で管理
- 本番環境ではHTTPS必須
- Firebase設定は定期的に確認
- 不要な環境変数は削除
