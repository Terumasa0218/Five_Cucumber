# Five Cucumber – 5本のきゅうり

A multi-game web application featuring the Five Cucumbers card game, built with Next.js, TypeScript, and Firebase.

## 📋 Walking Skeleton Implementation

This implementation follows the flowchart specification exactly, providing a minimal UI focused on screen transitions and user flow validation.

### 🗂️ File Structure

```
apps/hub/
├── app/
│   ├── page.tsx                    # Root redirect to /home
│   ├── home/page.tsx               # Home screen with 3 mode buttons
│   ├── cpu/settings/page.tsx       # CPU game settings (4 items)
│   ├── play/cpu/page.tsx           # CPU game placeholder
│   ├── online/page.tsx             # Online game placeholder
│   ├── friend/page.tsx             # Friend match entry
│   ├── friend/create/page.tsx      # Room creation
│   ├── friend/join/page.tsx        # Room joining
│   ├── room/[code]/page.tsx        # Room management
│   └── rules/page.tsx              # Rules placeholder
├── components/
│   └── PlayerSetupModal.tsx        # Nickname setup modal
├── hooks/
│   └── useRequireNickname.ts       # Nickname requirement hook
└── lib/
    ├── profile.ts                  # Profile management
    └── roomMock.ts                 # Room management mock
```

### 🔄 Flowchart Node Mapping

| Flowchart Node | Implementation File | URL Path | Description |
|---|---|---|---|
| `アプリ起動` | `app/page.tsx` | `/` | Root redirect to /home |
| `B1` (nickname saved) | `app/home/page.tsx` | `/home` | Home screen with 3 buttons |
| `E0[ホーム画面]` | `app/home/page.tsx` | `/home` | Mode selection screen |
| `F_CPU_Setting` | `app/cpu/settings/page.tsx` | `/cpu/settings` | CPU settings (4 items) |
| `F_CPU_Game` | `app/play/cpu/page.tsx` | `/play/cpu` | CPU game placeholder |
| `G_Online_Match` | `app/online/page.tsx` | `/online` | Online game placeholder |
| `H_Friend_Entry` | `app/friend/page.tsx` | `/friend` | Friend match entry |
| `H_CreateSet` | `app/friend/create/page.tsx` | `/friend/create` | Room creation settings |
| `I_RoomNumberInput` | `app/friend/join/page.tsx` | `/friend/join` | Room number input |
| `endNodeRoomScreen` | `app/room/[code]/page.tsx` | `/room/[code]` | Room management |
| `PlayerSetupModal` | `components/PlayerSetupModal.tsx` | - | Nickname setup modal |

### 🎯 Key Features

- **Nickname-First Flow**: No login required, nickname setup on first access
- **Page-Level Guards**: Nickname modal appears on specific pages (`/friend/*`, `/room/*`, `/online`)
- **Room Management**: 5-digit room codes, manual participant management
- **CPU Settings**: 4-item validation (players, cucumbers, time, difficulty)
- **Minimal UI**: Tailwind CSS with focus on functionality over decoration

### 🧪 Acceptance Criteria

1. ✅ `/` → `/home` redirect
2. ✅ Nickname modal on `/friend/join` direct access, stays on page after save
3. ✅ CPU settings: all 4 items required for "Game Start" button activation
4. ✅ CPU game: "End Game" returns to `/cpu/settings`
5. ✅ Room creation: generates 5-digit code → `/room/{code}`
6. ✅ Room joining: invalid code shows error, valid code → `/room/{code}`
7. ✅ Room management: manual `+参加`/`-退出`, "対戦開始" when full
8. ✅ Navigation links on all pages as specified

### 🔧 QA Testing Procedures

#### A) 初回アクセステスト
1. ブラウザのlocalStorageとCookieをクリア
2. `/home` にアクセス
3. **期待結果**: 自動でプレイヤー設定モーダルが開く
4. ニックネームを入力して保存
5. **期待結果**: モーダルが閉じ、`/home` のまま残る

#### B) 再アクセステスト
1. 上記Aで保存した状態でページをリロード
2. **期待結果**: `/home` ではモーダルは表示されない

#### C) 必須ページテスト
1. `window.resetProfile()` を実行してプロフィールを削除
2. `/friend/join` を直接アクセス
3. **期待結果**: そのページ上でモーダルが開く
4. ニックネームを入力して保存
5. **期待結果**: `/friend/join` に留まる（リダイレクトしない）

#### D) デバッグ機能テスト
1. 任意のページに `?forceProfile=1` を付けてアクセス
2. **期待結果**: 必ずモーダルが開く

#### E) ナビゲーションテスト
1. どのページでもブラウザの戻る/進むボタンを使用
2. ページを更新
3. **期待結果**: フローが壊れず、適切にモーダルが表示される

### 🛠️ Debug Commands

開発時に使用できるデバッグ機能：

```javascript
// プロフィールをリセット
window.resetProfile()

// 強制モーダル表示
// URLに ?forceProfile=1 を追加
```

### 🎭 Modal Implementation Details

#### 全画面オーバーレイモーダル仕様

- **レンダリング位置**: React Portal で `document.body` に直接描画
- **z-index**: `z-[1000]` でアプリ内要素より上位
- **オーバーレイ**: `fixed inset-0 bg-black/50` で全画面半透明
- **アクセシビリティ**: `role="dialog" aria-modal="true" aria-labelledby`

#### 非アクティブ化制御

- **スクロールロック**: `document.body.style.overflow = 'hidden'`
- **メインコンテンツ非アクティブ化**: `#app-root` に `inert` と `aria-hidden="true"`
- **ポインターイベント無効化**: `#app-root` に `pointer-events: none`

#### フォーカス管理

- **初期フォーカス**: ニックネーム入力フィールド
- **フォーカストラップ**: Tab/Shift+Tab でモーダル内循環
- **Esc キー**: autoモード（/home）のみで閉じる

#### モード別動作

| ページ | mode | Esc で閉じる | 外側クリックで閉じる |
|---|---|---|---|
| `/home` | `auto` | ✅ | ✅ |
| `/friend/*` | `require` | ❌ | ❌ |
| `/room/*` | `require` | ❌ | ❌ |
| `/online` | `require` | ❌ | ❌ |

### 📁 File Structure (Updated)

```
apps/hub/
├── app/
│   ├── layout.tsx                    # AppShell構造（#app-root）
│   ├── page.tsx                      # Root redirect to /home
│   ├── home/page.tsx                 # useRequireNickname({ mode: 'auto' })
│   ├── cpu/settings/page.tsx         # CPU game settings (4 items)
│   ├── play/cpu/page.tsx             # CPU game placeholder
│   ├── online/page.tsx               # useRequireNickname({ mode: 'require' })
│   ├── friend/page.tsx               # useRequireNickname({ mode: 'require' })
│   ├── friend/create/page.tsx        # useRequireNickname({ mode: 'require' })
│   ├── friend/join/page.tsx          # useRequireNickname({ mode: 'require' })
│   ├── room/[code]/page.tsx          # useRequireNickname({ mode: 'require' })
│   └── rules/page.tsx                # Rules placeholder
├── components/
│   └── PlayerSetupModal.tsx          # Portal全画面オーバーレイモーダル
├── contexts/
│   └── ProfileContext.tsx            # グローバルプロフィール制御
├── hooks/
│   └── useRequireNickname.ts         # mode引数対応フック
└── lib/
    ├── profile.ts                    # Profile management
    └── roomMock.ts                   # Room management mock
```

## 🎮 Features

- **Five Cucumbers Card Game**: A strategic card game where players try to avoid collecting 5 cucumbers
- **Multiplayer Support**: Play with 2-6 players, including CPU opponents
- **Real-time Presence**: See who's online and join games
- **Analytics Dashboard**: Track your game statistics and activity
- **Responsive Design**: Works on desktop and mobile devices
- **Internationalization**: Support for Japanese and English

## 🏗️ Architecture

This project uses a monorepo structure with Turborepo:

```
├── apps/
│   └── hub/                 # Next.js web application
├── packages/
│   ├── sdk/                 # Game module SDK
│   ├── ui/                  # Shared UI components
│   └── metrics/             # Firebase analytics
├── games/
│   └── cucumber5/           # Five Cucumbers game module
├── functions/               # Firebase Functions
└── docs/                    # Documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd five-cucumber
   ```

2. **Install dependencies**
   ```bash
   corepack enable
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example files
   cp apps/hub/env.example apps/hub/.env.local
   cp functions/env.example functions/.env
   
   # Edit with your Firebase configuration
   ```

4. **Start development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm lint` - Run linters
- `pnpm type-check` - Run TypeScript checks

### Project Structure

#### Apps
- **hub**: Main Next.js application with routing and UI

#### Packages
- **sdk**: Game module interface and utilities
- **ui**: Shared React components and theme
- **metrics**: Firebase analytics and presence management

#### Games
- **cucumber5**: Five Cucumbers card game implementation

### Adding New Games

1. Create a new game module in `games/`
2. Implement the `GameModule` interface from `@five-cucumber/sdk`
3. Register the game in `apps/hub/lib/gameLoader.ts`
4. Add game metadata and routing

## 🎯 Game Rules

### Five Cucumbers (５本のきゅうり)

- **Objective**: Avoid collecting 5 cucumbers
- **Players**: 2-6 players
- **Cards**: 105 cards (7 of each number 1-15)
- **Cucumber Values**:
  - Cards 2-5: 1 cucumber
  - Cards 6-9: 2 cucumbers  
  - Cards 10-11: 3 cucumbers
  - Cards 12-14: 4 cucumbers
  - Card 15: 5 cucumbers

**Gameplay**:
1. Each player starts with 7 cards
2. Players take turns playing cards to the field
3. Higher cards win the trick
4. In the final trick, players with the highest card get cucumbers
5. If someone played a "1", cucumber values are doubled
6. First player to collect 5 cucumbers loses

## 🔥 Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication, Firestore, Realtime Database, and Analytics

### 2. Configure Authentication

- Enable Anonymous authentication
- Enable Google authentication (optional)

### 3. Set up Firestore

The following collections will be created automatically:
- `matches` - Game match records
- `userStats` - User statistics
- `metrics` - Aggregated analytics

### 4. Set up Realtime Database

Used for presence tracking:
- `presence/{userId}` - User online status
- `onlineUsers/{userId}` - Online user data

### 5. Deploy Functions

```bash
cd functions
pnpm build
firebase deploy --only functions
```

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm exec playwright test
```

### Test Coverage
The E2E tests cover:
- Home page navigation and game selection
- Game initialization with different player counts
- Card interactions and gameplay
- Responsive design on mobile devices

## 📊 Analytics

The application tracks:
- Game matches and outcomes
- User statistics and win rates
- Online presence and activity
- Performance metrics

Data is aggregated hourly and stored in Firestore for dashboard display.

## 🎨 Theming

The application uses a custom antique theme with CSS variables:

```css
:root {
  --paper: #e6dcc9;
  --ink: #3f3a33;
  --cuke: #3f4d3e;
  --brass: #8a6f43;
  --gold: #bfa670;
}
```

Dark mode is supported via `[data-theme="dark"]`.

## 🌐 Internationalization

Supported languages:
- Japanese (ja) - Default
- English (en)

Translations are stored in `docs/i18n/` and loaded via react-i18next.

## 🚀 Deployment

### Firebase Hosting

```bash
pnpm build
firebase deploy --only hosting
```

### Environment Variables

Set the following in your Firebase project:
- `NEXT_PUBLIC_FIREBASE_*` - Client-side Firebase config
- `FIREBASE_*` - Server-side Firebase admin config

Client-side server sync flags (Vercel Project Settings → Environment Variables):

- `NEXT_PUBLIC_HAS_SHARED_STORE` = `1` (or `true`) to enable server sync (API/Ably) in browser when shared store is configured
- `NEXT_PUBLIC_USE_SERVER` = `1` (optional force enable)

Server-side secrets (do not expose publicly):

- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (Vercel KV / Upstash KV)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (Upstash Redis)
- `ABLY_API_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Original Five Cucumbers game concept
- Firebase for backend services
- Next.js and React for the frontend
- Turborepo for monorepo management
