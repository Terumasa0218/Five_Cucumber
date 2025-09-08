# Telemetry Specification

## イベント設計

### Firebase Analytics Events

| イベント名 | 目的 | タイミング | 必須パラメータ | 任意パラメータ | サンプルPayload |
|-----------|------|-----------|---------------|---------------|-----------------|
| `login` | ユーザー認証追跡 | ログイン成功時 | `method` | `timestamp` | `{method: "email", timestamp: 1234567890}` |
| `presence_view` | オンライン状況確認 | /home表示時 | `online_count` | `time_of_day` | `{online_count: 42, time_of_day: 14}` |
| `lobby_create` | 部屋作成追跡 | 作成ボタンクリック | `game_id`, `room_code` | `settings` | `{game_id: "cucumber5", room_code: "ABC123"}` |
| `lobby_join` | 部屋参加追跡 | 参加成功時 | `game_id`, `room_code` | `player_count` | `{game_id: "cucumber5", room_code: "ABC123", player_count: 3}` |
| `match_start` | ゲーム開始追跡 | ゲーム開始時 | `game_id`, `player_count`, `mode` | `difficulty` | `{game_id: "cucumber5", player_count: 4, mode: "online"}` |
| `match_end` | ゲーム終了追跡 | ゲーム終了時 | `game_id`, `duration_sec`, `result` | `final_scores` | `{game_id: "cucumber5", duration_sec: 600, result: "win"}` |
| `error_ui` | UIエラー追跡 | エラー表示時 | `error_type`, `screen` | `details` | `{error_type: "network", screen: "/play"}` |
| `settings_change` | 設定変更追跡 | 設定保存時 | `setting_type`, `value` | - | `{setting_type: "theme", value: "dark"}` |

### Firestore Collections

```javascript
// presence (リアルタイムオンライン状況)
{
  userId: "user123",
  lastSeen: Timestamp,
  status: "online" | "idle" | "offline",
  currentGame: "cucumber5" | null,
  location: "/home" | "/play/:id" | etc
}

// matches (試合履歴)
{
  gameId: "cucumber5",
  roomCode: "ABC123",
  players: ["user1", "user2"],
  startTime: Timestamp,
  endTime: Timestamp,
  winner: "user1",
  scores: {user1: 3, user2: 5},
  duration: 600
}

// daily_stats (日次集計)
{
  date: "2025-09-04",
  hourlyActive: [10, 12, 15, ...], // 24要素
  totalGames: 250,
  uniquePlayers: 89,
  avgDuration: 485
}
```

## KPIとダッシュボード

### 主要KPI
1. DAU/MAU: 日次・月次アクティブユーザー
2. 同時接続数: リアルタイム最大値・平均値
3. 平均セッション時間: ログイン〜ログアウト
4. ゲーム完了率: 開始数 vs 完了数
5. リテンション: 1日後、7日後、30日後

### 時間帯ヒートマップ仕様
- 表示形式: 24時間 × 7日間グリッド
- 色: 濃淡5段階（0, 1-5, 6-10, 11-20, 21+人）
- 凡例: グリッド下部に配置
- 空データ: グレー表示 + "データなし"
- タイムゾーン: ユーザーのローカルタイムゾーン自動適用
- 更新頻度: 5分ごと（リアルタイムデータベース経由）
- ツールチップ: ホバーで詳細人数表示

### /stats画面UI要件

```
┌─────────────────────────────────────┐
│ オンライン状況（過去7日間）          │
│ [ヒートマップグリッド 24×7]         │
│ 月 火 水 木 金 土 日                │
│ ■■□□■■■ (0時)                    │
│ □□□□□■■ (1時)                    │
│ ...                                 │
│ 凡例: □0 ░1-5 ▒6-10 ▓11-20 ■21+  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ゲーム別統計                        │
│ ├ 5本のきゅうり                    │
│ │ ├ 総プレイ: 1,234回              │
│ │ ├ 平均時間: 8分30秒              │
│ │ └ 人気時間: 20-22時              │
└─────────────────────────────────────┘
```