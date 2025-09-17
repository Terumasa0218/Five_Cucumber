'use client';

import { useState } from 'react';

interface CodeSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySuggestion: (code: string) => void;
  currentCode?: string;
  filePath?: string;
}

export default function CodeSuggestions({ 
  isOpen, 
  onClose, 
  onApplySuggestion, 
  currentCode = '', 
  filePath = '' 
}: CodeSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<number>(-1);

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/code-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentCode,
          filePath,
          context: 'Five Cucumber Game Development'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        throw new Error('Failed to get suggestions');
      }
    } catch (error) {
      console.error('Code suggestions error:', error);
      setSuggestions([
        '// エラーが発生しました。手動でコードを確認してください。',
        '// デバッグログを追加して問題を特定しましょう。',
        '// try-catch ブロックでエラーハンドリングを改善しましょう。'
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    onApplySuggestion(suggestion);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-3/4 flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">コード提案</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* ファイル情報 */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="text-sm text-gray-600">
            <strong>ファイル:</strong> {filePath || '現在のファイル'}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            <strong>コード行数:</strong> {currentCode.split('\n').length} 行
          </div>
        </div>

        {/* アクションボタン */}
        <div className="p-4 border-b">
          <button
            onClick={generateSuggestions}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '提案を生成中...' : 'コード提案を生成'}
          </button>
        </div>

        {/* 提案一覧 */}
        <div className="flex-1 overflow-y-auto p-4">
          {suggestions.length === 0 && !isLoading ? (
            <div className="text-center text-gray-500 py-8">
              コード提案を生成するには「コード提案を生成」ボタンをクリックしてください。
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSuggestion === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedSuggestion(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      提案 {index + 1}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplySuggestion(suggestion);
                      }}
                      className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                    >
                      適用
                    </button>
                  </div>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                    <code>{suggestion}</code>
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            💡 ヒント: 提案をクリックして詳細を確認し、「適用」ボタンでコードに追加できます。
          </div>
        </div>
      </div>
    </div>
  );
}
