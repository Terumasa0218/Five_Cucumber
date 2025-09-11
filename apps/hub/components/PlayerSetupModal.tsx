'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { setProfile, validateNickname, type Profile } from '@/lib/profile';
import { useEffect, useRef, useState } from 'react';

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
  const { isOpen, close } = useProfile();
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarOptions[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nicknameInputRef = useRef<HTMLInputElement>(null);

  // モーダル表示制御
  useEffect(() => {
    if (!dialogRef.current) return;

    if (isOpen) {
      dialogRef.current.showModal();
      // 初期フォーカス
      setTimeout(() => {
        nicknameInputRef.current?.focus();
      }, 100);
    } else {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // フォーカストラップ
  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = dialog.querySelectorAll(
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
        const isHomePage = window.location.pathname === '/home';
        const urlParams = new URLSearchParams(window.location.search);
        const isForceProfile = urlParams.get('forceProfile') === '1';
        
        if (isHomePage || isForceProfile) {
          close();
        }
        // requireモードではEscを無視
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

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

  const handleCancel = () => {
    // autoモード（/home）のみキャンセル可能
    const isHomePage = window.location.pathname === '/home';
    const urlParams = new URLSearchParams(window.location.search);
    const isForceProfile = urlParams.get('forceProfile') === '1';
    
    if (isHomePage || isForceProfile) {
      close();
    }
    // requireモードではキャンセルを無視
  };

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm bg-transparent p-0 max-w-none max-h-none w-full h-full"
      onCancel={(e) => {
        // requireモードではキャンセルを無視
        const isHomePage = window.location.pathname === '/home';
        const urlParams = new URLSearchParams(window.location.search);
        const isForceProfile = urlParams.get('forceProfile') === '1';
        
        if (!isHomePage && !isForceProfile) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-center">プレイヤー設定</h2>
          
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
                onClick={handleCancel}
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
    </dialog>
  );
}