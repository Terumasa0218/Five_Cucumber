import { expect, test } from '@playwright/test';

test.describe('Home Page', () => {
  test('shows the current game entry points', async ({ page }) => {
    await page.goto('/home');

    await expect(page).toHaveTitle(/Five Cucumber/);
    await expect(page.getByRole('heading', { name: '5本のきゅうり' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ルール説明' })).toHaveAttribute(
      'href',
      '/rules',
    );
    await expect(page.getByRole('link', { name: 'CPU対戦を始める' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'フレンド対戦を始める' })).toBeVisible();
  });

  test('opens CPU settings from the primary CTA', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('link', { name: 'CPU対戦を始める' }).click();

    await expect(page).toHaveURL('/cucumber/cpu/settings');
    await expect(page.getByRole('heading', { name: 'CPU 対戦の設定' })).toBeVisible();
  });

  test('opens friend room creation from the primary CTA', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('link', { name: 'フレンド対戦を始める' }).click();

    await expect(page).toHaveURL('/friend/create');
    await expect(page.getByRole('heading', { name: 'フレンドルームを作成' })).toBeVisible();
  });
});
