import { NextRequest, NextResponse } from 'next/server';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: ChatRequest = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // 現在はモックレスポンスを返す
    // 実際の実装では OpenAI API や他のAIサービスを呼び出す
    const response = await generateAIResponse(lastMessage.content, context, messages);

    return NextResponse.json({
      message: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIResponse(
  userMessage: string, 
  context?: string, 
  messageHistory?: ChatMessage[]
): Promise<string> {
  // モックAIレスポンス（実際の実装では OpenAI API を使用）
  
  const lowerMessage = userMessage.toLowerCase();
  
  // ゲーム開発関連のキーワードに基づく応答
  if (lowerMessage.includes('エラー') || lowerMessage.includes('error')) {
    return `エラーの解決をお手伝いします！

**一般的なデバッグ手順:**
1. ブラウザの開発者ツール（F12）でコンソールエラーを確認
2. ネットワークタブでAPI呼び出しの状況を確認
3. エラーメッセージの詳細を確認

**Five Cucumber特有の問題:**
- ルームID不一致: ルーム参加時のID検証を確認
- プレイヤー参加エラー: ルーム状態とプレイヤーリストを確認
- ゲーム進行停止: CPUターンの処理と状態管理を確認

具体的なエラーメッセージを教えていただければ、より詳細な解決策を提案できます。`;
  }

  if (lowerMessage.includes('コード') || lowerMessage.includes('code')) {
    return `コードの改善や新機能の実装をお手伝いします！

**Five Cucumber の主要コンポーネント:**
- \`EllipseTable\`: ゲーム盤面の表示
- \`BattleLayout\`: 対戦画面のレイアウト
- \`Timer\`: 制限時間の管理
- \`roomSystemUnified\`: ルーム管理システム

**よく使われるパターン:**
- React Hooks: useState, useEffect, useRef
- 非同期処理: async/await, Promise
- 状態管理: ゲーム状態の更新と同期

どの部分のコードについて質問がありますか？具体的なファイル名や機能を教えてください。`;
  }

  if (lowerMessage.includes('フレンド') || lowerMessage.includes('friend')) {
    return `フレンド対戦機能について説明します！

**フレンド対戦の流れ:**
1. ルーム作成: \`/friend/create\`
2. ルーム参加: \`/friend/join\`
3. 待機画面: \`/friend/room/[roomId]\`
4. ゲーム開始: \`/friend/play/[roomCode]\`

**主要な修正点:**
- プレイヤー参加の厳密なチェック
- ルーム状態の検証
- エラーハンドリングの改善
- リアルタイム更新の最適化

**よくある問題:**
- 404エラー: ルームID不一致
- プレイヤー参加失敗: ルーム状態の確認
- ゲーム進行停止: プレイヤーインデックスの設定

何か特定の問題がありますか？`;
  }

  if (lowerMessage.includes('cpu') || lowerMessage.includes('CPU')) {
    return `CPU対戦機能について説明します！

**CPU対戦の特徴:**
- プレイヤー1人 + CPU複数体
- 難易度設定: 簡単/普通/難しい
- 自動ターン処理
- ゲーム状態の自動管理

**主要ファイル:**
- \`/cucumber/cpu/play/page.tsx\`: ゲーム画面
- \`/cucumber/cpu/settings/page.tsx\`: 設定画面

**CPUロジック:**
- 合法手の検証
- 戦略的なカード選択
- タイムアウト処理

CPU対戦で何か問題がありますか？`;
  }

  if (lowerMessage.includes('デバッグ') || lowerMessage.includes('debug')) {
    return `デバッグを効率的に行うためのヒントをお教えします！

**開発者ツールの活用:**
1. Console: ログメッセージの確認
2. Network: API呼び出しの監視
3. Sources: ブレークポイントの設定
4. Application: LocalStorageの確認

**Five Cucumber のデバッグポイント:**
- ゲーム状態: \`gameState\` オブジェクト
- プレイヤー情報: \`currentPlayerIndex\`
- ルーム情報: \`roomConfig\`
- エラー処理: try-catch ブロック

**ログの確認方法:**
\`console.log('[Friend Game]', data)\` のような形式でログを出力

どの部分のデバッグで困っていますか？`;
  }

  // デフォルト応答
  return `Five Cucumber ゲームの開発をサポートします！

**利用可能な機能:**
- エラー解決のサポート
- コード改善の提案
- フレンド対戦機能の説明
- CPU対戦機能の説明
- デバッグ支援

**質問の例:**
- "フレンド対戦でエラーが発生する"
- "CPU対戦のコードを改善したい"
- "デバッグの方法を教えて"
- "新しい機能を追加したい"

何かお手伝いできることはありますか？具体的に質問してください！`;
}
