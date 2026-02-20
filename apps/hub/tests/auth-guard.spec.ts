import { test, expect } from '@playwright/test';

test.describe('home/middleware', () => {
  test('/home から /friend が利用可能', async ({ page }) => {
    await page.goto('/home');

    const friendLink = page.locator('a[href="/friend"]');
    await expect(friendLink).toBeVisible();

    await friendLink.click();
    await expect(page).toHaveURL(/\/friend$/);
  });
});
