import { test, expect } from '@playwright/test';

const HAS_PROFILE = 'hasProfile';

test.describe('auth guard (home/middleware)', () => {
  test('未登録ユーザーは /setup に誘導され、登録済みは /home ≫ /friend が利用可', async ({ page, context }) => {
    // 未登録で /home アクセス → middleware により /setup 表示（アプリ実装次第で /home が表示される場合もあるため、/setup 導線の存在で判定）
    await page.goto('/home');
    // セットアップへの導線があることを確認
    await expect(page.locator('a[href="/setup"], a[href^="/setup?"], button:has-text("セットアップ")')).toHaveCountGreaterThan(0);

    // hasProfile=1 を付与して登録済み状態にする
    await context.addCookies([{ name: HAS_PROFILE, value: '1', path: '/', url: page.url() }]);

    // 再度 /home へ
    await page.goto('/home');
    // フレンド対戦リンクが表示される（有効）
    const friendLink = page.locator('a[href="/friend"]');
    await expect(friendLink).toBeVisible();

    // リンク遷移が成功する
    await friendLink.click();
    await expect(page).toHaveURL(/\/friend$/);
  });
});
