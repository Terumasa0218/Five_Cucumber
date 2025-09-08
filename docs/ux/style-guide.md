# UX Style Guide - Table of Classics

## Design Principles

### 可読性とアクセシビリティ
- 最小フォントサイズ: 14px（モバイル）、16px（デスクトップ）
- 行間: 1.5em以上
- 文字間隔: 0.02em（日本語）、0（英数字）
- WCAG AA準拠: コントラスト比4.5:1以上（通常テキスト）、3:1以上（大型テキスト）

### 色弱対応
- 色のみに依存しない情報伝達（形状・パターン・テキストを併用）
- 赤緑色弱に配慮した配色選択
- 重要な状態変化は明度差60%以上で表現

### トーン&ボイス
- 視覚: アンティーク調、温かみ、クラフト感
- 文体: 丁寧だが堅すぎない、懐かしさと親しみやすさ
- 動き: 控えめで上品、機能的

### モーション方針
- 入場: ease-out 300ms（カード配布、プレイヤー参加）
- 強調: scale(1.05) 200ms（ホバー、選択可能状態）
- 退場: ease-in 200ms（カード回収、プレイヤー退出）
- 禁止: 派手なバウンス、回転アニメーション
- reduced-motion時: transitionを0ms、transformをnoneに

## Design Tokens（CSS変数）

```css
:root {
  /* Base Colors - アンティーク紙の質感 */
  --paper: #f4ede4;
  --paper-edge: #e8dcc6;
  --ink: #2c2825;
  
  /* Theme Colors */
  --cuke: #4a5d47;
  --brass: #9b7e4a;
  --gold: #d4a574;
  
  /* UI Elements */
  --radius: 12px;
  --shadow: 0 4px 12px rgba(44, 40, 37, 0.15);
  --focus-ring: rgba(212, 165, 116, 0.5);
  
  /* State Colors */
  --danger: #a84432;
  --mute: #8b8176;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
}

[data-theme="dark"] {
  --paper: #1f1d1a;
  --paper-edge: #2b2824;
  --ink: #f0e6d8;
  --cuke: #7a9975;
  --brass: #c4a46e;
  --gold: #e6c08a;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  --danger: #d6604d;
  --mute: #5c574e;
}
```

## 画面フロー

### /login
- 主要要素: ロゴ、ゲストプレイボタン、アカウント作成、ログインフォーム
- 状態: 空/読み込み/エラー/成功
- キーボード: Tab順（ゲスト→メール→パスワード→ログイン）
- トースト: 「ようこそ」「ログインに失敗しました」

### /home
- 主要要素: ヘッダー、ゲームタイル一覧、オンライン人数バッジ
- フォーカス: 最初のゲームタイルから開始
- ショートカット: 数字キー(1-9)でゲーム選択

### /lobby/:gameId
- 主要要素: 参加者リスト、ゲーム設定、開始ボタン、チャット
- 状態: 待機中/準備完了/開始中
- トースト: 「{name}が参加しました」「まもなく開始します」

### /play/:gameId
- 主要要素: 円形テーブル、手札、場札、スコアボード、タイマー
- キーボード: 矢印キー(カード選択)、Enter/Space(カード提出)、Esc(設定)

### /stats
- 主要要素: ヒートマップ、統計グラフ、ランキング
- 状態: データ読み込み/表示/エラー

### /settings
- 主要要素: 言語切替、テーマ切替、サウンド設定、アニメーション設定

## コンポーネント仕様

### Header
- props: `title`, `showBack`, `rightAction`
- 状態: オンライン人数の動的更新
- ショートカット: Alt+H でホームへ

### GameTile
- props: `game`, `playerCount`, `isLocked`
- 状態: normal/hover/pressed/disabled
- 相互作用: クリックでlobbyへ遷移

### LobbyPanel
- props: `players`, `settings`, `isHost`
- 状態: 待機/準備完了/カウントダウン

### PlayerBadge
- props: `player`, `position`, `isActive`, `score`
- 状態: オンライン/オフライン/思考中/勝利

### TableLayout
- props: `playerCount`, `currentPlayer`, `dealer`
- 状態: 座席配置の動的計算
- 相互作用: 空席クリックで参加

### Wires
- props: `from`, `to`, `type`, `isAnimating`
- 2レーン制御: 内側（場）/外側（墓地）

### Timer
- props: `duration`, `onExpire`, `isPaused`
- 状態: 通常/警告（10秒以下）/期限切れ

### Toast
- props: `message`, `type`, `duration`
- タイプ: info/success/warning/error

### PresenceBadge
- props: `count`, `trend`
- 更新頻度: 30秒ごと

### Heatmap
- props: `data`, `range`, `timezone`
- 表示: 24時間×7日間のグリッド

## コピー/マイクロ文言の原則

### 原則
1. 簡潔性: 必要最小限の言葉で伝える
2. 一貫性: 同じ概念には同じ用語を使用
3. 親しみやすさ: 専門用語を避ける
4. アクション志向: 動詞で始める指示

### NG例→修正例
- NG: 「エラーが発生しました」→ OK: 「接続が切れました。再接続しています...」
- NG: 「Submit」→ OK: 「カードを出す」
- NG: 「Invalid move」→ OK: 「このカードは出せません」
- NG: 「Waiting...」→ OK: 「他のプレイヤーを待っています」

## "5本のきゅうり"専用UI規約

### カード状態の視覚表現
- 通常: 白背景 + 黒数字
- 選択可能: 金縁 + わずかな浮き上がり
- 選択中: 金背景 + scale(1.05)
- 無効: グレーアウト + 斜線パターン
- 最終トリック: きゅうりアイコン + パルスアニメーション
- 勝敗確定: 勝者は金色グロー、敗者は赤色フェード

### 場・墓地の視認性
- 場: 中央に大きく表示、最後に出されたカードを強調
- 墓地: 外周にコンパクト配置、オーナー名を併記
- トリック勝者への移動: ベジェ曲線で滑らかに

### 最終トリック演出
- 開始: 「最終トリック！」の短いトースト（1秒）
- カード提出: 通常より少し遅い移動（400ms）
- 決着: きゅうりカウント表示（1秒維持）→フェードアウト

## 実装チェックリスト
- [ ] 全画面でスクロール無しで表示確認
- [ ] コントラスト比4.5:1以上を全テキストで確認
- [ ] キーボードのみで全操作可能
- [ ] reduced-motionでアニメーション停止確認
- [ ] 日英切り替えでレイアウト崩れなし
- [ ] ダークテーマで全要素の視認性確認
- [ ] 2/4/5/6人プレイでレイアウト確認
- [ ] 60fps維持（Chrome DevTools Performance）