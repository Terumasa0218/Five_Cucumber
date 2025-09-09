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

### 2. 認証機能のテスト

1. `/auth/login` にアクセス
2. メールリンク認証が正常に動作することを確認
3. 認証後のリダイレクトが正しく動作することを確認

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
