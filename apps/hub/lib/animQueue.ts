// アニメーションキュー - 直列化されたアニメーション処理

let animationPromise: Promise<unknown> = Promise.resolve();

/**
 * アニメーションタスクをキューに追加して直列実行
 * @param task 実行するアニメーションタスク
 * @returns タスクの結果を含むPromise
 */
export const runAnimation = <T>(task: () => Promise<T> | T): Promise<T> => {
  const taskPromise = animationPromise.then(() => task()).catch((error) => {
    console.error('Animation task failed:', error);
    throw error;
  });
  
  animationPromise = taskPromise.catch(() => {
    // エラーが発生してもキューを継続
  });
  
  return taskPromise;
};

/**
 * 指定時間待機するヘルパー関数
 * @param ms 待機時間（ミリ秒）
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * キューをクリアする（緊急時用）
 */
export const clearAnimationQueue = (): void => {
  animationPromise = Promise.resolve();
};
