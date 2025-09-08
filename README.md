# Five Cucumber - 遊び大全

A multi-game web application featuring the Five Cucumbers card game, built with Next.js, TypeScript, and Firebase.

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
