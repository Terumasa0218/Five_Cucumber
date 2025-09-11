'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { setProfile, validateNickname, type Profile } from '@/lib/profile';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ダミーアイコン配列
const avatarOptions = [
  { id: '1', emoji: '🥒' },
  { id: '2', emoji: '🎮' },
  { id: '3', emoji: '🎯' },
  { id: '4', emoji: '🎲' },
  { id: '5', emoji: '🎪' },
  { id: '6', emoji: '🎨' }
];

export default function PlayerSetupModal() {
  const { isOpen, close, profile } = useProfile();
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const nicknameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // SSR/SSG中はレンダリングしない
  useEffect(() => {
    setMounted(true);
  }, []);

  // モーダル表示時のスクロールロックとinert制御
  useEffect(() => {
    if (!mounted) return;

    if (isOpen) {
      // スクロールロック
      document.body.style.overflow = 'hidden';
      
      // メインコンテンツを非アクティブ化
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.setAttribute('inert', '');
        appRoot.setAttribute('aria-hidden', 'true');
        appRoot.style.pointerEvents = 'none';
      }

      // 初期フォーカス
      setTimeout(() => {
        nicknameInputRef.current?.focus();
      }, 100);
    } else {
      // スクロールロック解除
      document.body.style.overflow = '';
      
      // メインコンテンツを再アクティブ化
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.removeAttribute('inert');
        appRoot.removeAttribute('aria-hidden');
        appRoot.style.pointerEvents = '';
      }
    }

    // クリーンアップ
    return () => {
      document.body.style.overflow = '';
      const appRoot = document.getElementById('app-root');
      if (appRoot) {
        appRoot.removeAttribute('inert');
        appRoot.removeAttribute('aria-hidden');
        appRoot.style.pointerEvents = '';
      }
    };
  }, [isOpen, mounted]);

  // フォーカストラップ
  useEffect(() => {
    if (!isOpen || !mounted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      } else if (e.key === 'Escape') {
        // autoモード（/home）のみEscで閉じられる
        const urlParams = new URLSearchParams(window.location.search);
        const isHomePage = window.location.pathname === '/home';
        const isForceProfile = urlParams.get('forceProfile') === '1';
        
        if (isHomePage || isForceProfile) {
          close();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mounted, close]);

  if (!mounted || !isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // バリデーション
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setError(validation.error || 'エラーが発生しました');
      setIsSubmitting(false);
      return;
    }

    try {
      const profile: Profile = {
        nickname,
        avatarId: selectedAvatar
      };

      setProfile(profile);
      close();
    } catch (err) {
      setError('保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={(e) => {
        // requireモードでは外側クリックで閉じない
        const urlParams = new URLSearchParams(window.location.search);
        const isHomePage = window.location.pathname === '/home';
        const isForceProfile = urlParams.get('forceProfile') === '1';
        
        if (e.target === e.currentTarget && (isHomePage || isForceProfile)) {
          close();
        }
      }}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-setup-title"
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="player-setup-title" className="text-xl font-bold mb-4 text-center">
          プレイヤー設定
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ニックネーム入力 */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              ニックネーム (1-8文字)
            </label>
            <input
              ref={nicknameInputRef}
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ニックネームを入力"
              maxLength={8}
              required
            />
          </div>

          {/* アイコン選択 */}
          <div>
            <label className="block text-sm font-medium mb-2">アイコン</label>
            <div className="grid grid-cols-6 gap-2">
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.id)}
                  className={`w-12 h-12 text-2xl rounded-md border-2 transition-colors ${
                    selectedAvatar === avatar.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {avatar.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* 言語切替ボタン */}
          <div>
            <button
              type="button"
              className="w-full py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              言語切替
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={close}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}