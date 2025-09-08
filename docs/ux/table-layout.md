# Table Layout Specification

## 円形座席の数式

### 座席位置計算
```
θ_i = -90° + i * (360° / N)
P_i = C + R · (cos(θ_i), sin(θ_i))
```

### 座席の向き
- 外枠: `transform: rotate(θ_i + 90deg)`
- 内容: `transform: rotate(-(θ_i + 90deg))` で正立維持

### 半径の計算
```
R = min(width, height) / 2 - safeMargin
safeMargin = 80px (モバイル), 100px (デスクトップ)
```

## 2レーン配線仕様

### レーン半径
- 内側レーン（場へ）: `R_in = R - 60px`
- 外側レーン（墓地へ）: `R_out = R + 40px`

### 接線方向ファンアウト
```
offset_tangent = (rank - median_rank) * 12px
rank: 席の時計回り順序（0〜N-1）
median_rank: floor(N / 2)
```

### ベジェ曲線制御
```javascript
// S字カーブ（内側レーン）
control1 = lerp(start, end, 0.3) + tangent_offset
control2 = lerp(start, end, 0.7) - tangent_offset

// 逆S字カーブ（外側レーン）  
control1 = lerp(start, end, 0.3) - tangent_offset
control2 = lerp(start, end, 0.7) + tangent_offset
```

### 交差最小化の根拠
- 同一レーン内での交差を回避（内/外の分離）
- 接線方向へのオフセットで視覚的分離を強化
- 対角線上のプレイヤー間は必然的に交差するが、曲線の膨らみで視認性確保

## スケーリング戦略

### 座席スケール
```
seatScale = clamp(0.76, 1.0, 4 / N)
```
- 2人: 1.0（最大サイズ）
- 4人: 1.0
- 5人: 0.8
- 6人: 0.76（最小サイズ）

### 最小キャンバスサイズ
- モバイル横持ち: 667 × 375px
- タブレット: 1024 × 768px  
- デスクトップ: 1280 × 720px

## ASCIIワイヤーフレーム

### 2人プレイ
```
        [P0]
         |
    ----[場]----
         |
        [P1]
```

### 4人プレイ
```
      [P0]
       /|\
    [P3]-[場]-[P1]
       \|/
      [P2]
```

### 5人プレイ
```
       [P0]
      / | \
   [P4] | [P1]
     \[場]/
    [P3] [P2]
```

### 6人プレイ
```
       [P0]
      / | \
   [P5] | [P1]
    |  [場] |
   [P4] | [P2]
      \ | /
       [P3]
```

## 失敗パターンと回避策

### 1. 配線の交差
- 問題: 隣接プレイヤーの配線が重なる
- 対策: tangent_offsetを動的に調整（最大±36px）

### 2. 座席のはみ出し
- 問題: 画面端でPlayerBadgeが切れる
- 対策: safeMaginを維持、必要に応じてRを縮小

### 3. 中央の混雑
- 問題: 6人プレイで場が狭い
- 対策: 場のカードを少し重ねて表示（overlap: -8px）

### 4. テキストの重なり
- 問題: プレイヤー名が長い場合
- 対策: max-width + text-overflow: ellipsis