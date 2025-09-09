import { test, expect } from '@playwright/test';

test.describe('auth guard', () => {
  test('フレンド対戦のガード挙動', async ({ page }) => {
    // 1) 未ログインで /home → 「フレンド対戦」カードが disabled
    await page.goto('/home');
    
    const friendsCard = page.locator('a[href*="mode=friends"]');
    await expect(friendsCard).toHaveAttribute('aria-disabled', 'true');
    await expect(friendsCard).toHaveClass(/pointer-events-none/);
    await expect(friendsCard).toHaveClass(/cursor-not-allowed/);
    await expect(friendsCard).toHaveClass(/opacity-50/);
    
    // サブコピーが「ログインすると利用できます」になっている
    await expect(friendsCard.locator('p')).toContainText('ログインすると利用できます');

    // 2) 未ログインで /lobby/cucumber5?mode=friends → /auth/login にリダイレクト
    await page.goto('/lobby/cucumber5?mode=friends');
    
    // URLに next= パラメータが含まれている
    await expect(page).toHaveURL(/\/auth\/login\?next=/);
    
    // TODO: ログイン後の disabled 解除テスト
    // メールリンク認証のモックが複雑なため、簡易的なモック実装が必要
    // 現在は signInAnonymously を使わず isAnonymous=false にする方法を検討中
  });
});
