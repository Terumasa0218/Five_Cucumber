import { useState, useCallback } from 'react';

interface AIAssistantState {
  isAIAssistantOpen: boolean;
  isCodeSuggestionsOpen: boolean;
  isDebugAssistantOpen: boolean;
  currentContext: string;
  currentCode: string;
  currentFilePath: string;
  errorLogs: string[];
  gameState: any;
  roomConfig: any;
}

export function useAIAssistant() {
  const [state, setState] = useState<AIAssistantState>({
    isAIAssistantOpen: false,
    isCodeSuggestionsOpen: false,
    isDebugAssistantOpen: false,
    currentContext: '',
    currentCode: '',
    currentFilePath: '',
    errorLogs: [],
    gameState: null,
    roomConfig: null
  });

  const openAIAssistant = useCallback((context: string = '') => {
    setState(prev => ({
      ...prev,
      isAIAssistantOpen: true,
      currentContext: context
    }));
  }, []);

  const closeAIAssistant = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAIAssistantOpen: false
    }));
  }, []);

  const openCodeSuggestions = useCallback((code: string, filePath: string) => {
    setState(prev => ({
      ...prev,
      isCodeSuggestionsOpen: true,
      currentCode: code,
      currentFilePath: filePath
    }));
  }, []);

  const closeCodeSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCodeSuggestionsOpen: false
    }));
  }, []);

  const openDebugAssistant = useCallback((errorLogs: string[] = [], gameState?: any, roomConfig?: any) => {
    setState(prev => ({
      ...prev,
      isDebugAssistantOpen: true,
      errorLogs,
      gameState,
      roomConfig
    }));
  }, []);

  const closeDebugAssistant = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDebugAssistantOpen: false
    }));
  }, []);

  const applyCodeSuggestion = useCallback((code: string) => {
    // コード提案を適用する処理
    console.log('Applying code suggestion:', code);
    // 実際の実装では、エディタやコードエリアに適用する
  }, []);

  const addErrorLog = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      errorLogs: [...prev.errorLogs, error]
    }));
  }, []);

  const clearErrorLogs = useCallback(() => {
    setState(prev => ({
      ...prev,
      errorLogs: []
    }));
  }, []);

  const updateGameState = useCallback((gameState: any) => {
    setState(prev => ({
      ...prev,
      gameState
    }));
  }, []);

  const updateRoomConfig = useCallback((roomConfig: any) => {
    setState(prev => ({
      ...prev,
      roomConfig
    }));
  }, []);

  return {
    // 状態
    ...state,
    
    // AI アシスタント
    openAIAssistant,
    closeAIAssistant,
    
    // コード提案
    openCodeSuggestions,
    closeCodeSuggestions,
    applyCodeSuggestion,
    
    // デバッグアシスタント
    openDebugAssistant,
    closeDebugAssistant,
    
    // エラーログ管理
    addErrorLog,
    clearErrorLogs,
    
    // 状態更新
    updateGameState,
    updateRoomConfig
  };
}
