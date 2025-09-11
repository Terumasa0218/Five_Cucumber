"use client";

// クライアント用ラッパー - 共通関数を再エクスポート
export {
  validateNickname,
  normalizeNickname,
  graphemeLength,
  ALLOW_RE,
  ALLOW_ONE_RE,
  ALLOW_CHAR_CLASS,
  type NicknameValidation
} from "./nickname.shared";