# Home UI 調査メモ

## 現象の整理
- `homeUI/` フォルダに含まれる Anima 由来のデザインでは、背景画像 `home13-1.png` と円形パス文字 `text-on-a-path.png` を重ねたヒーローセクションが定義されている。
- Next.js 側 (`apps/hub/app/home/_components/DesktopHero.tsx`) では別の背景 (`/assets/home13.png`) を参照し、円形パスや補助リンク装飾が省かれていたため、エクスポート済みの UI が再現されていなかった。
- 「CPU対戦」「フレンド対戦」ボタンの遷移先がいずれも `/play/...` 配下を向いており、設定画面やルーム作成画面に遷移しない状態だった。

## 原因分析
1. **背景アセットの参照漏れ**  
   デザイン元 (`homeUI/src/screens/Desktop/Desktop.tsx`) では `/img/home13-1.png` を利用しているが、Next.js 実装では `/assets/home13.png` を読みに行っていた。  
   さらに円形テキスト (`text-on-a-path.png`) を描画していないため、画面中央上部の装飾が欠落していた。
2. **ルーティングの不整合**  
   Next.js ルーティング構成は `/cpu/settings` と `/friend/create` が設定画面・ルーム作成画面になっている一方、ホームの CTA は `/play/cpu` と `/play/friend` にリンクしていた。  
   `/play/cpu` は仮置きのプレースホルダー画面、`/play/friend` はルーティングが存在しないため 404 を返す状態だった。

## 対応内容
- 背景画像を `public/home/home13-1.png` に差し替え、Anima の装飾画像 `text-on-a-path.png` を `public/home/` に追加して重畳表示するよう更新。  
- ルール説明リンクや言語切替トグルをデザインどおり左上に配置し直し、テキスト装飾を合わせた。  
- CTA の遷移先を `/cpu/settings` および `/friend/create` に修正し、期待どおり設定画面／ルーム作成画面に遷移するよう変更。

## 残課題と推奨改善
- `homeUI` の他要素（例：CTA ボタンの影やレスポンシブ調整）が完全一致しているか確認し、必要に応じて CSS を追加調整する。  
- 画像サイズが大きいため、WebP など軽量フォーマットへの変換を検討する。  
- スタイルの共通化を目的に、Anima 由来の CSS を Storybook などで可視化しながら差異検証するとスムーズ。

## Cursor 用プロンプト
```
ホーム画面のヒーローセクションを Anima エクスポートと一致させたいです。
- 背景画像を `/public/home/home13-1.png` に差し替え、`/public/home/text-on-a-path.png` を中央上部に重ねてください。
- CTA ボタンは `/cpu/settings` と `/friend/create` に遷移させ、文言は「CPU対戦」「フレンド対戦」のまま。
- 左上のヘルプリンクは「📖 ルール説明」と言語切替トグルを縦に並べ、ユーザー名表示は右上に配置。
- homeUI/ デザインに基づき、フォント・影・レスポンシブ挙動が揃うよう CSS を微調整してください。
実装後、`apps/hub/app/home/_components/DesktopHero.(tsx|module.css)` と関連アセットを見直し、差分のスクリーンショット確認もお願いします。
```


