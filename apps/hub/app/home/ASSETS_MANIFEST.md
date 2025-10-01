# Home Route Assets Manifest

| Asset Path | Purpose | Notes |
| --- | --- | --- |
| `/home/home13-1.png` | ヒーローカード背景 | 可能なら `/home/home13-1.webp` に変換して軽量化すると推奨。 |

## チェック方法

ローカルで必要な画像が揃っているかどうかを確認するには、次のコマンドを実行してください。

```bash
pnpm run assets:exists
```

ファイルが存在しない場合は WARN が表示されます。ビルドは継続されますが、デザイン崩れを防ぐため早めに配置してください。


