# 依存関係管理ガイド

## 概要

このプロジェクトは pnpm を使用したモノレポ構成です。依存関係の変更時は適切な手順に従って lock ファイルを更新し、CI/CD パイプラインでのビルド失敗を防ぎます。

## 依存関係変更時の手順

### 1. 依存関係を追加/変更

```bash
# ルートレベルの依存関係
pnpm add <package-name>

# 特定のワークスペースの依存関係
pnpm add <package-name> --filter @five-cucumber/hub
pnpm add <package-name> --filter @five-cucumber/sdk
```

### 2. Lock ファイルを更新

```bash
# 必ず実行: lock ファイルを更新
pnpm install

# 変更を確認
git status
```

### 3. 変更をコミット

```bash
# lock ファイルを含めてコミット
git add pnpm-lock.yaml
git add package.json  # 依存関係を変更した場合
git commit -m "chore: update dependencies"
git push
```

## 重要なルール

### ✅ 必須事項

1. **依存関係を変更したら必ず `pnpm install` を実行**
2. **`pnpm-lock.yaml` を必ずコミット**
3. **lock ファイルの更新を忘れない**

### ❌ 避けるべきこと

1. **lock ファイルを無視する**
2. **`--frozen-lockfile` でローカル開発する**
3. **依存関係変更をコミットせずに push する**

## CI/CD での対応

### GitHub Actions

- **ローカル**: `pnpm install` で lock ファイルを更新
- **CI**: `pnpm install --no-frozen-lockfile` でビルド継続
- **本番**: lock ファイルが古くてもビルド可能

### Vercel

- **Install Command**: `pnpm install --no-frozen-lockfile`
- **Build Command**: 空欄（自動検出）
- **Output Directory**: 空欄（自動検出）

## トラブルシューティング

### ERR_PNPM_OUTDATED_LOCKFILE エラー

このエラーが発生した場合：

1. **ローカルで lock ファイルを更新**:
   ```bash
   pnpm install
   git add pnpm-lock.yaml
   git commit -m "chore: update pnpm-lock"
   git push
   ```

2. **CI で `--no-frozen-lockfile` を使用**:
   ```bash
   pnpm install --no-frozen-lockfile
   ```

### 依存関係の競合

複数のワークスペースで異なるバージョンが必要な場合：

```bash
# 特定のワークスペースに依存関係を追加
pnpm add <package-name>@<version> --filter @five-cucumber/hub

# ルートレベルで管理
pnpm add <package-name>@<version> -w
```

## ワークスペース構成

```
Five_Cucumber/
├── apps/
│   └── hub/           # Next.js アプリケーション
├── packages/
│   ├── sdk/           # 共有 SDK
│   ├── ui/            # UI コンポーネント
│   └── metrics/       # メトリクス
├── games/
│   └── cucumber5/     # ゲームモジュール
└── functions/         # Firebase Functions
```

## 開発者向けチェックリスト

### 依存関係変更時

- [ ] `pnpm install` を実行
- [ ] `pnpm-lock.yaml` が更新されたことを確認
- [ ] 変更をコミット
- [ ] CI でビルドが成功することを確認

### 新機能開発時

- [ ] 必要な依存関係を追加
- [ ] lock ファイルを更新
- [ ] ローカルでビルドテスト
- [ ] 変更をコミット・プッシュ

### リリース前

- [ ] 全依存関係が最新か確認
- [ ] セキュリティ脆弱性がないか確認
- [ ] lock ファイルが最新か確認
- [ ] CI/CD パイプラインが正常に動作するか確認

## 参考リンク

- [pnpm 公式ドキュメント](https://pnpm.io/)
- [pnpm ワークスペース](https://pnpm.io/workspaces)
- [Vercel デプロイメントガイド](../deploy/vercel.md)
- [GitHub Actions CI/CD](../.github/workflows/ci.yml)
