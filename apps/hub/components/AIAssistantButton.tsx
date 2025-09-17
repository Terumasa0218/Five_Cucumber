'use client';

import { useState } from 'react';
import AIAssistant from './AIAssistant';
import CodeSuggestions from './CodeSuggestions';
import DebugAssistant from './DebugAssistant';
import { useAIAssistant } from '../hooks/useAIAssistant';

interface AIAssistantButtonProps {
  context?: string;
  currentCode?: string;
  filePath?: string;
  errorLogs?: string[];
  gameState?: any;
  roomConfig?: any;
}

export default function AIAssistantButton({
  context = 'Five Cucumber Game Development',
  currentCode = '',
  filePath = '',
  errorLogs = [],
  gameState,
  roomConfig
}: AIAssistantButtonProps) {
  const {
    isAIAssistantOpen,
    isCodeSuggestionsOpen,
    isDebugAssistantOpen,
    openAIAssistant,
    closeAIAssistant,
    openCodeSuggestions,
    closeCodeSuggestions,
    openDebugAssistant,
    closeDebugAssistant,
    applyCodeSuggestion
  } = useAIAssistant();

  const [showMenu, setShowMenu] = useState(false);

  const handleCodeSuggestions = () => {
    openCodeSuggestions(currentCode, filePath);
    setShowMenu(false);
  };

  const handleDebugAssistant = () => {
    openDebugAssistant(errorLogs, gameState, roomConfig);
    setShowMenu(false);
  };

  const handleAIAssistant = () => {
    openAIAssistant(context);
    setShowMenu(false);
  };

  return (
    <>
      {/* AI支援ボタン */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="relative">
          {/* メニューボタン */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
            title="AI支援機能"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>

          {/* メニュー */}
          {showMenu && (
            <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border min-w-48">
              <div className="py-2">
                <button
                  onClick={handleAIAssistant}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  AI アシスタント
                </button>
                
                <button
                  onClick={handleCodeSuggestions}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  コード提案
                </button>
                
                <button
                  onClick={handleDebugAssistant}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  デバッグ支援
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI支援コンポーネント */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={closeAIAssistant}
        context={context}
      />
      
      <CodeSuggestions
        isOpen={isCodeSuggestionsOpen}
        onClose={closeCodeSuggestions}
        onApplySuggestion={applyCodeSuggestion}
        currentCode={currentCode}
        filePath={filePath}
      />
      
      <DebugAssistant
        isOpen={isDebugAssistantOpen}
        onClose={closeDebugAssistant}
        errorLogs={errorLogs}
        gameState={gameState}
        roomConfig={roomConfig}
      />
    </>
  );
}
