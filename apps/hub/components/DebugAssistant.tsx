'use client';

import { useState, useEffect } from 'react';

interface DebugAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  errorLogs?: string[];
  gameState?: any;
  roomConfig?: any;
}

export default function DebugAssistant({ 
  isOpen, 
  onClose, 
  errorLogs = [], 
  gameState, 
  roomConfig 
}: DebugAssistantProps) {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      analyzeDebugInfo();
    }
  }, [isOpen, errorLogs, gameState, roomConfig]);

  const analyzeDebugInfo = async () => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/ai/debug-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorLogs,
          gameState,
          roomConfig,
          context: 'Five Cucumber Game Debugging'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDebugInfo(data.analysis);
        setSuggestions(data.suggestions || []);
      } else {
        throw new Error('Failed to analyze debug info');
      }
    } catch (error) {
      console.error('Debug analysis error:', error);
      setSuggestions([
        'コンソールエラーを確認してください',
        'ネットワークタブでAPI呼び出しを確認してください',
        'ゲーム状態の値を確認してください'
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-4/5 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">デバッグアシスタント</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 左側: デバッグ情報 */}
          <div className="w-1/2 p-4 border-r overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">現在の状態</h3>
            
            {/* エラーログ */}
            <div className="mb-6">
              <h4 className="font-medium text-red-600 mb-2">エラーログ</h4>
              <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                {errorLogs.length > 0 ? (
                  errorLogs.map((log, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">エラーなし</div>
                )}
              </div>
            </div>

            {/* ゲーム状態 */}
            {gameState && (
              <div className="mb-6">
                <h4 className="font-medium text-blue-600 mb-2">ゲーム状態</h4>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <pre className="text-sm text-blue-800 overflow-x-auto">
                    {JSON.stringify(gameState, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* ルーム設定 */}
            {roomConfig && (
              <div className="mb-6">
                <h4 className="font-medium text-green-600 mb-2">ルーム設定</h4>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <pre className="text-sm text-green-800 overflow-x-auto">
                    {JSON.stringify(roomConfig, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* 右側: 分析結果と提案 */}
          <div className="w-1/2 p-4 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">分析結果</h3>
            
            {isAnalyzing ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">分析中...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 分析結果 */}
                {debugInfo.summary && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h4 className="font-medium text-yellow-800 mb-2">概要</h4>
                    <p className="text-sm text-yellow-700">{debugInfo.summary}</p>
                  </div>
                )}

                {/* 提案 */}
                <div>
                  <h4 className="font-medium text-purple-600 mb-2">推奨アクション</h4>
                  <div className="space-y-2">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="bg-purple-50 border border-purple-200 rounded p-3">
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-purple-700 flex-1">{suggestion}</p>
                          <button
                            onClick={() => copyToClipboard(suggestion)}
                            className="ml-2 text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300"
                          >
                            コピー
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* デバッグコマンド */}
                <div>
                  <h4 className="font-medium text-gray-600 mb-2">デバッグコマンド</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => copyToClipboard('console.log("[Debug] Game State:", gameState);')}
                      className="w-full text-left bg-gray-50 border border-gray-200 rounded p-2 text-sm hover:bg-gray-100"
                    >
                      console.log("[Debug] Game State:", gameState);
                    </button>
                    <button
                      onClick={() => copyToClipboard('console.log("[Debug] Room Config:", roomConfig);')}
                      className="w-full text-left bg-gray-50 border border-gray-200 rounded p-2 text-sm hover:bg-gray-100"
                    >
                      console.log("[Debug] Room Config:", roomConfig);
                    </button>
                    <button
                      onClick={() => copyToClipboard('console.log("[Debug] Current Player:", currentPlayerIndex);')}
                      className="w-full text-left bg-gray-50 border border-gray-200 rounded p-2 text-sm hover:bg-gray-100"
                    >
                      console.log("[Debug] Current Player:", currentPlayerIndex);
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 ヒント: デバッグコマンドをクリックしてコピーし、コンソールで実行してください。
            </div>
            <button
              onClick={analyzeDebugInfo}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {isAnalyzing ? '分析中...' : '再分析'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
