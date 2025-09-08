# デプロイメントガイド

## Vercelでのデプロイ

### 1. 前提条件
- Vercelアカウント
- Firebaseプロジェクト
- GitHubリポジトリ

### 2. 環境変数の設定

Vercelのダッシュボードで以下の環境変数を設定してください：

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Five Cucumbers
NEXT_PUBLIC_APP_DESCRIPTION=A card game where you try not to collect 5 cucumbers
```

### 3. デプロイ手順

1. GitHubリポジトリをVercelに接続
2. プロジェクト設定で以下を指定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/hub`
   - **Build Command**: `cd ../.. && pnpm build`
   - **Install Command**: `cd ../.. && pnpm install`
   - **Output Directory**: `apps/hub/.next`

### 4. Firebase設定

Firebaseプロジェクトで以下を設定：

1. **Authentication**: 匿名認証を有効化
2. **Realtime Database**: ルールを設定
3. **Firestore**: セキュリティルールを設定
4. **Analytics**: 有効化

### 5. カスタムドメイン（オプション）

Vercelでカスタムドメインを設定する場合：
1. ドメインを追加
2. DNS設定を更新
3. SSL証明書の確認

## ローカルでのテスト

```bash
# 依存関係のインストール
pnpm install

# 開発サーバーの起動
pnpm dev

# ビルドテスト
pnpm build
```

## トラブルシューティング

### ビルドエラー
- TypeScriptエラーを確認
- 依存関係のバージョンを確認
- 環境変数の設定を確認

### ランタイムエラー
- ブラウザのコンソールを確認
- Vercelのログを確認
- Firebaseの設定を確認

## パフォーマンス最適化

- 画像の最適化
- コード分割の確認
- キャッシュ設定の最適化
- CDNの活用
