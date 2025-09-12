// 多言語対応の設定

export type Language = 'ja' | 'en';

export interface Translations {
  // 共通
  home: string;
  rules: string;
  language: string;
  start: string;
  create: string;
  back: string;
  
  // ホームページ
  homeTitle: string;
  homeSubtitle: string;
  welcomeMessage: string;
  cpuBattle: string;
  friendBattle: string;
  onlineBattle: string;
  comingSoon: string;
  
  // フレンド対戦
  friendTitle: string;
  friendSubtitle: string;
  createRoom: string;
  joinRoomPage: string;
  
  // ルーム
  roomTitle: string;
  roomSettings: string;
  participants: string;
  players: string;
  cucumbers: string;
  timeLimit: string;
  joinRoom: string;
  leaveRoom: string;
  startGame: string;
  full: string;
  empty: string;
  
  // 設定
  settings: string;
  playerCount: string;
  cucumberCount: string;
  turnTime: string;
  cpuLevel: string;
  easy: string;
  normal: string;
  hard: string;
  unlimited: string;
  
  // ゲーム
  round: string;
  trick: string;
  yourTurn: string;
  cpuTurn: string;
  gameOver: string;
  
  // エラー
  error: string;
  networkError: string;
  serverError: string;
  invalidInput: string;
  duplicateName: string;
}

const translations: Record<Language, Translations> = {
  ja: {
    // 共通
    home: 'ホーム',
    rules: 'ルール',
    language: '言語切替',
    start: 'はじめる',
    create: '作成',
    back: '戻る',
    
    // ホームページ
    homeTitle: 'ホーム',
    homeSubtitle: '遊び方を選んでください。',
    welcomeMessage: 'ようこそ、{name}さん！',
    cpuBattle: 'CPU対戦',
    friendBattle: 'フレンド対戦',
    onlineBattle: 'オンライン対戦',
    comingSoon: '近日公開',
    
    // フレンド対戦
    friendTitle: 'フレンド対戦',
    friendSubtitle: 'ルームを作成するか、既存のルームに参加してください',
    createRoom: 'ルーム作成',
    joinRoomPage: 'ルーム参加',
    
    // ルーム
    roomTitle: 'ルーム',
    roomSettings: 'ルーム設定',
    participants: '参加者',
    players: '人数',
    cucumbers: 'きゅうり数',
    timeLimit: '制限時間',
    joinRoom: '＋参加',
    leaveRoom: '－退出',
    startGame: '対戦開始',
    full: '満員',
    empty: '空き',
    
    // 設定
    settings: '設定',
    playerCount: '人数',
    cucumberCount: 'きゅうり数',
    turnTime: '制限時間',
    cpuLevel: 'CPU難易度',
    easy: 'かんたん',
    normal: 'ふつう',
    hard: 'むずかしい',
    unlimited: '無制限',
    
    // ゲーム
    round: '回戦',
    trick: 'トリック',
    yourTurn: 'あなたの番',
    cpuTurn: 'CPUの番',
    gameOver: 'ゲーム終了',
    
    // エラー
    error: 'エラー',
    networkError: '通信エラー',
    serverError: 'サーバーエラー',
    invalidInput: '無効な入力',
    duplicateName: 'このユーザー名はすでにつかわれています',
  },
  
  en: {
    // 共通
    home: 'Home',
    rules: 'Rules',
    language: 'Language',
    start: 'Start',
    create: 'Create',
    back: 'Back',
    
    // ホームページ
    homeTitle: 'Home',
    homeSubtitle: 'Choose how to play.',
    welcomeMessage: 'Welcome, {name}!',
    cpuBattle: 'CPU Battle',
    friendBattle: 'Friend Battle',
    onlineBattle: 'Online Battle',
    comingSoon: 'Coming Soon',
    
    // フレンド対戦
    friendTitle: 'Friend Battle',
    friendSubtitle: 'Create a room or join an existing room',
    createRoom: 'Create Room',
    joinRoomPage: 'Join Room',
    
    // ルーム
    roomTitle: 'Room',
    roomSettings: 'Room Settings',
    participants: 'Participants',
    players: 'Players',
    cucumbers: 'Cucumbers',
    timeLimit: 'Time Limit',
    joinRoom: '+ Join',
    leaveRoom: '- Leave',
    startGame: 'Start Game',
    full: 'Full',
    empty: 'Empty',
    
    // 設定
    settings: 'Settings',
    playerCount: 'Players',
    cucumberCount: 'Cucumbers',
    turnTime: 'Turn Time',
    cpuLevel: 'CPU Level',
    easy: 'Easy',
    normal: 'Normal',
    hard: 'Hard',
    unlimited: 'Unlimited',
    
    // ゲーム
    round: 'Round',
    trick: 'Trick',
    yourTurn: 'Your Turn',
    cpuTurn: 'CPU Turn',
    gameOver: 'Game Over',
    
    // エラー
    error: 'Error',
    networkError: 'Network Error',
    serverError: 'Server Error',
    invalidInput: 'Invalid Input',
    duplicateName: 'This username is already taken',
  }
};

export function getTranslations(lang: Language): Translations {
  return translations[lang];
}

export function getCurrentLanguage(): Language {
  if (typeof window === 'undefined') return 'ja';
  
  const stored = localStorage.getItem('language') as Language;
  return stored && ['ja', 'en'].includes(stored) ? stored : 'ja';
}

export function setLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('language', lang);
  document.cookie = `language=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function t(key: keyof Translations, lang?: Language, params?: Record<string, string>): string {
  const currentLang = lang || getCurrentLanguage();
  const translation = getTranslations(currentLang)[key];
  
  if (params) {
    return translation.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
  }
  
  return translation;
}