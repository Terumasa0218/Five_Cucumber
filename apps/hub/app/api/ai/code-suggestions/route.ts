import { NextRequest, NextResponse } from 'next/server';

interface CodeSuggestionRequest {
  currentCode: string;
  filePath: string;
  context?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: CodeSuggestionRequest = await req.json();
    const { currentCode, filePath, context } = body;

    if (!currentCode) {
      return NextResponse.json(
        { error: 'Current code is required' },
        { status: 400 }
      );
    }

    // 現在はモックレスポンスを返す
    // 実際の実装では OpenAI Codex API や他のAIサービスを呼び出す
    const suggestions = await generateCodeSuggestions(currentCode, filePath, context);

    return NextResponse.json({
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code suggestions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateCodeSuggestions(
  currentCode: string,
  filePath: string,
  context?: string
): Promise<string[]> {
  // モックコード提案（実際の実装では AI を使用）
  
  const suggestions: string[] = [];
  
  // ファイルパスに基づく提案
  if (filePath.includes('friend/play')) {
    suggestions.push(
      `// フレンド対戦のエラーハンドリング改善
try {
  const result = await fetchRoomConfig();
  if (!result) {
    console.error('[Friend Game] Failed to fetch room config');
    router.push('/home');
    return;
  }
} catch (error) {
  console.error('[Friend Game] Error:', error);
  router.push('/home');
}`
    );
    
    suggestions.push(
      `// プレイヤー参加状態の確認
const isPlayerInRoom = room.seats.some((seat: any) => 
  seat?.nickname === getNickname()
);
if (!isPlayerInRoom) {
  console.error('[Friend Game] Player not in room');
  router.push(\`/friend/room/\${roomCode}\`);
  return;
}`
    );
  }

  if (filePath.includes('cpu/play')) {
    suggestions.push(
      `// CPU対戦の状態管理改善
const isProcessingRef = useRef<boolean>(false);

const playCpuTurn = async () => {
  if (isProcessingRef.current) return;
  isProcessingRef.current = true;
  
  try {
    // CPU処理
  } finally {
    isProcessingRef.current = false;
  }
};`
    );
  }

  if (filePath.includes('roomSystemUnified')) {
    suggestions.push(
      `// ルームシステムのログ改善
export function joinRoom(roomId: string, nickname: string) {
  console.log(\`[RoomSystem] Joining room \${roomId} with \${nickname}\`);
  
  try {
    const rooms = getRoomsStorage();
    const room = rooms.get(roomId);
    
    if (!room) {
      console.error(\`[RoomSystem] Room \${roomId} not found\`);
      return { success: false, reason: 'not-found' };
    }
    
    // 参加処理
  } catch (error) {
    console.error('[RoomSystem] Join error:', error);
    return { success: false, reason: 'server-error' };
  }
}`
    );
  }

  // 一般的なコード改善提案
  if (currentCode.includes('useEffect')) {
    suggestions.push(
      `// useEffect の依存関係の最適化
useEffect(() => {
  // 処理
}, [dependency1, dependency2]); // 必要な依存関係のみ`
    );
  }

  if (currentCode.includes('fetch')) {
    suggestions.push(
      `// API呼び出しのエラーハンドリング改善
const response = await fetch(url);
if (!response.ok) {
  throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
}
const data = await response.json();
if (!data.ok) {
  throw new Error('Invalid response format');
}`
    );
  }

  if (currentCode.includes('setState')) {
    suggestions.push(
      `// 状態更新の最適化
setState(prevState => ({
  ...prevState,
  newProperty: newValue
}));`
    );
  }

  // デバッグ関連の提案
  suggestions.push(
    `// デバッグログの追加
console.log('[Debug] Current state:', {
  gameState: gameState?.currentPlayer,
  roomConfig: roomConfig?.size,
  currentPlayer: currentPlayerIndex
});`
  );

  // パフォーマンス改善の提案
  suggestions.push(
    `// メモ化によるパフォーマンス改善
const memoizedValue = useMemo(() => {
  return expensiveCalculation(dependency);
}, [dependency]);`
  );

  return suggestions.slice(0, 5); // 最大5つの提案を返す
}
