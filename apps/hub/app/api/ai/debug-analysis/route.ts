import { NextRequest, NextResponse } from 'next/server';

interface DebugAnalysisRequest {
  errorLogs: string[];
  gameState?: any;
  roomConfig?: any;
  context?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: DebugAnalysisRequest = await req.json();
    const { errorLogs, gameState, roomConfig, context } = body;

    // 現在はモックレスポンスを返す
    // 実際の実装では AI を使用してデバッグ分析を行う
    const analysis = await analyzeDebugInfo(errorLogs, gameState, roomConfig);

    return NextResponse.json({
      analysis: analysis.analysis,
      suggestions: analysis.suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug analysis API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeDebugInfo(
  errorLogs: string[],
  gameState?: any,
  roomConfig?: any
): Promise<{ analysis: any; suggestions: string[] }> {
  const suggestions: string[] = [];
  let summary = '';

  // エラーログの分析
  if (errorLogs.length > 0) {
    const errorTypes = analyzeErrorTypes(errorLogs);
    
    if (errorTypes.includes('404')) {
      summary += '404エラーが検出されました。ルームID不一致の可能性があります。';
      suggestions.push('ルームIDが正しく設定されているか確認してください');
      suggestions.push('API呼び出しのURLを確認してください');
    }
    
    if (errorTypes.includes('network')) {
      summary += 'ネットワークエラーが検出されました。';
      suggestions.push('インターネット接続を確認してください');
      suggestions.push('APIサーバーの状態を確認してください');
    }
    
    if (errorTypes.includes('type')) {
      summary += '型エラーが検出されました。';
      suggestions.push('TypeScriptの型定義を確認してください');
      suggestions.push('プロパティの存在を確認してください');
    }
  } else {
    summary = 'エラーログは検出されませんでした。';
  }

  // ゲーム状態の分析
  if (gameState) {
    if (gameState.currentPlayer === undefined) {
      summary += ' ゲーム状態でcurrentPlayerが未定義です。';
      suggestions.push('currentPlayerの初期化を確認してください');
    }
    
    if (gameState.phase === undefined) {
      summary += ' ゲームフェーズが未定義です。';
      suggestions.push('ゲームフェーズの初期化を確認してください');
    }
    
    if (gameState.players && gameState.players.length === 0) {
      summary += ' プレイヤーリストが空です。';
      suggestions.push('プレイヤーの初期化を確認してください');
    }
  }

  // ルーム設定の分析
  if (roomConfig) {
    if (!roomConfig.size || roomConfig.size < 2) {
      summary += ' ルームサイズが無効です。';
      suggestions.push('ルームサイズを2以上に設定してください');
    }
    
    if (!roomConfig.seats || roomConfig.seats.length === 0) {
      summary += ' ルームの席情報が無効です。';
      suggestions.push('ルームの席情報を正しく初期化してください');
    }
    
    if (roomConfig.turnSeconds && roomConfig.turnSeconds < 0) {
      summary += ' 制限時間が無効です。';
      suggestions.push('制限時間を0以上に設定してください');
    }
  }

  // 一般的なデバッグ提案
  suggestions.push('ブラウザの開発者ツールでコンソールエラーを確認してください');
  suggestions.push('ネットワークタブでAPI呼び出しの状況を確認してください');
  suggestions.push('ゲーム状態の値をコンソールに出力して確認してください');

  return {
    analysis: {
      summary: summary || 'デバッグ情報を分析しました。',
      errorCount: errorLogs.length,
      hasGameState: !!gameState,
      hasRoomConfig: !!roomConfig
    },
    suggestions
  };
}

function analyzeErrorTypes(errorLogs: string[]): string[] {
  const errorTypes: string[] = [];
  
  errorLogs.forEach(log => {
    const lowerLog = log.toLowerCase();
    
    if (lowerLog.includes('404') || lowerLog.includes('not found')) {
      errorTypes.push('404');
    }
    
    if (lowerLog.includes('network') || lowerLog.includes('fetch')) {
      errorTypes.push('network');
    }
    
    if (lowerLog.includes('type') || lowerLog.includes('property')) {
      errorTypes.push('type');
    }
    
    if (lowerLog.includes('undefined') || lowerLog.includes('null')) {
      errorTypes.push('undefined');
    }
  });
  
  return [...new Set(errorTypes)]; // 重複を削除
}
