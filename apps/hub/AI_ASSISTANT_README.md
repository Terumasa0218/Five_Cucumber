# AI Assistant (GPT Codex機能) 使用ガイド

## 概要

Five Cucumber プロジェクトに統合されたAI支援機能を使用して、開発効率を向上させることができます。

## 機能一覧

### 1. AI アシスタント
- 開発に関する質問への回答
- エラー解決のサポート
- コード改善の提案

### 2. コード提案
- 現在のコードに基づく改善提案
- ファイルパスに応じた最適化
- コピー&ペースト可能なコードスニペット

### 3. デバッグ支援
- エラーログの分析
- ゲーム状態の診断
- 推奨アクションの提示

## 使用方法

### 基本的な使用方法

```tsx
import AIAssistantButton from '@/components/AIAssistantButton';

function MyComponent() {
  return (
    <div>
      {/* あなたのコンポーネント */}
      
      {/* AI支援ボタンを追加 */}
      <AIAssistantButton
        context="フレンド対戦画面の開発"
        currentCode={currentCode}
        filePath="apps/hub/app/friend/play/[roomCode]/page.tsx"
        errorLogs={errorLogs}
        gameState={gameState}
        roomConfig={roomConfig}
      />
    </div>
  );
}
```

### 個別の機能を使用する場合

```tsx
import { useAIAssistant } from '@/hooks/useAIAssistant';
import AIAssistant from '@/components/AIAssistant';
import CodeSuggestions from '@/components/CodeSuggestions';
import DebugAssistant from '@/components/DebugAssistant';

function MyComponent() {
  const {
    isAIAssistantOpen,
    openAIAssistant,
    closeAIAssistant,
    // その他の機能...
  } = useAIAssistant();

  return (
    <div>
      <button onClick={() => openAIAssistant('CPU対戦の開発')}>
        AI アシスタントを開く
      </button>
      
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={closeAIAssistant}
        context="CPU対戦の開発"
      />
    </div>
  );
}
```

## API エンドポイント

### 1. AI チャット
```
POST /api/ai/chat
```

**リクエスト:**
```json
{
  "messages": [
    { "role": "user", "content": "フレンド対戦でエラーが発生する" }
  ],
  "context": "Five Cucumber Game Development"
}
```

**レスポンス:**
```json
{
  "message": "エラーの解決をお手伝いします！...",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. コード提案
```
POST /api/ai/code-suggestions
```

**リクエスト:**
```json
{
  "currentCode": "const [gameState, setGameState] = useState(null);",
  "filePath": "apps/hub/app/friend/play/[roomCode]/page.tsx",
  "context": "Five Cucumber Game Development"
}
```

**レスポンス:**
```json
{
  "suggestions": [
    "// フレンド対戦のエラーハンドリング改善\ntry {\n  const result = await fetchRoomConfig();\n  if (!result) {\n    console.error('[Friend Game] Failed to fetch room config');\n    router.push('/home');\n    return;\n  }\n} catch (error) {\n  console.error('[Friend Game] Error:', error);\n  router.push('/home');\n}"
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. デバッグ分析
```
POST /api/ai/debug-analysis
```

**リクエスト:**
```json
{
  "errorLogs": ["Failed to load resource: 404"],
  "gameState": { "currentPlayer": 0, "phase": "AwaitMove" },
  "roomConfig": { "size": 2, "seats": [...] },
  "context": "Five Cucumber Game Debugging"
}
```

**レスポンス:**
```json
{
  "analysis": {
    "summary": "404エラーが検出されました。ルームID不一致の可能性があります。",
    "errorCount": 1,
    "hasGameState": true,
    "hasRoomConfig": true
  },
  "suggestions": [
    "ルームIDが正しく設定されているか確認してください",
    "API呼び出しのURLを確認してください"
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 実装例

### フレンド対戦画面での使用例

```tsx
// apps/hub/app/friend/play/[roomCode]/page.tsx
import AIAssistantButton from '@/components/AIAssistantButton';

export default function FriendPlayPage() {
  const [gameState, setGameState] = useState(null);
  const [roomConfig, setRoomConfig] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);

  // エラーログを追加する関数
  const addErrorLog = (error: string) => {
    setErrorLogs(prev => [...prev, error]);
  };

  return (
    <div>
      {/* ゲーム画面 */}
      
      {/* AI支援ボタン */}
      <AIAssistantButton
        context="フレンド対戦画面の開発"
        currentCode={currentCode}
        filePath="apps/hub/app/friend/play/[roomCode]/page.tsx"
        errorLogs={errorLogs}
        gameState={gameState}
        roomConfig={roomConfig}
      />
    </div>
  );
}
```

### CPU対戦画面での使用例

```tsx
// apps/hub/app/cucumber/cpu/play/page.tsx
import AIAssistantButton from '@/components/AIAssistantButton';

export default function CpuPlayPage() {
  const [gameState, setGameState] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);

  return (
    <div>
      {/* ゲーム画面 */}
      
      {/* AI支援ボタン */}
      <AIAssistantButton
        context="CPU対戦画面の開発"
        currentCode={currentCode}
        filePath="apps/hub/app/cucumber/cpu/play/page.tsx"
        errorLogs={errorLogs}
        gameState={gameState}
      />
    </div>
  );
}
```

## カスタマイズ

### 独自のAI応答を追加

`apps/hub/app/api/ai/chat/route.ts` の `generateAIResponse` 関数を編集して、独自の応答ロジックを追加できます。

### コード提案のカスタマイズ

`apps/hub/app/api/ai/code-suggestions/route.ts` の `generateCodeSuggestions` 関数を編集して、プロジェクト固有のコード提案を追加できます。

### デバッグ分析の拡張

`apps/hub/app/api/ai/debug-analysis/route.ts` の `analyzeDebugInfo` 関数を編集して、独自のデバッグ分析ロジックを追加できます。

## 注意事項

- 現在の実装はモックレスポンスを使用しています
- 実際のAIサービス（OpenAI API等）を統合する場合は、APIキーの設定が必要です
- 本番環境では適切なエラーハンドリングとセキュリティ対策を実装してください

## 今後の拡張予定

- OpenAI API の統合
- リアルタイムコード分析
- 自動テスト生成
- パフォーマンス最適化提案
- セキュリティ脆弱性の検出
