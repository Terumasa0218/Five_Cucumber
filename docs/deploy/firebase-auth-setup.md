# Firebase Email Link認証設定ガイド

## 1. Firebaseコンソールでの設定

### Email Link認証を有効化

1. **Firebaseコンソール**にログイン
2. 対象プロジェクトを選択
3. 左メニューから **「Authentication」** → **「Sign-in method」**
4. **「Email/Password」** を選択
5. **「Email link (passwordless sign-in)」** を有効化
6. **「Save」** で保存

### 認証ドメインの設定

1. **「Authentication」** → **「Settings」** → **「Authorized domains」**
2. 以下のドメインを追加：
   - `localhost` (開発用)
   - `five-cucumber-hub.vercel.app` (本番用)
   - その他必要なドメイン

## 2. 環境変数の設定

### ローカル環境 (.env.local)

```env
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
```

### Vercel環境

1. Vercelダッシュボード → プロジェクト → **「Settings」**
2. **「Environment Variables」** → **「Add New」**
3. 以下を設定：
   - **Name**: `NEXT_PUBLIC_APP_ORIGIN`
   - **Value**: `https://five-cucumber-hub.vercel.app`
   - **Environment**: `Production`

## 3. 動作確認手順

### ログイン機能のテスト

1. `/auth/login` にアクセス
2. **「新規作成」** タブを選択
3. ユーザー名とメールアドレスを入力
4. **「リンクを送信」** をクリック
5. メール受信確認
6. メール内のリンクをクリック
7. `/auth/complete` で認証完了
8. `/home` にリダイレクト確認

### ログイン機能のテスト

1. **「ログイン」** タブを選択
2. メールアドレスを入力
3. **「リンクを送信」** をクリック
4. メール内のリンクで認証完了

## 4. トラブルシューティング

### よくある問題

- **メールが届かない**: 迷惑メールフォルダを確認
- **リンクが無効**: 同じブラウザで開く必要がある
- **認証エラー**: Firebase設定と環境変数を再確認

### ログ確認

```bash
# 開発環境でのログ確認
pnpm -w dev

# ブラウザの開発者ツールでコンソールエラーを確認
```

## 5. セキュリティ考慮事項

- Email Link認証は一時的なリンク（有効期限あり）
- 同じデバイス/ブラウザでのみ有効
- 本番環境ではHTTPS必須
- ユーザー名の重複チェック（現在は簡易実装）

## 6. 今後の改善点

- [ ] Cloud Functions でのユーザー名排他制御
- [ ] メールテンプレートのカスタマイズ
- [ ] 認証状態の永続化
- [ ] エラーハンドリングの強化
