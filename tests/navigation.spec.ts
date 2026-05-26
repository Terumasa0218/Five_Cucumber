import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('home links point at current MVP routes', async ({ page }) => {
    await page.goto('/home');

    await expect(page).toHaveTitle(/Five Cucumber/);
    await expect(page.getByRole('heading', { name: '5本のきゅうり' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CPU対戦を始める' })).toHaveAttribute(
      'href',
      '/cucumber/cpu/settings',
    );
    await expect(page.getByRole('link', { name: 'フレンド対戦を始める' })).toHaveAttribute(
      'href',
      '/friend/create',
    );
    await expect(page.getByRole('link', { name: 'オンライン対戦' })).toHaveAttribute(
      'href',
      '/online',
    );
  });

  test('legacy play route redirects to CPU play and preserves settings', async ({ page }) => {
    await page.goto('/play/cucumber5?mode=cpu&players=2&difficulty=easy&turnSeconds=0');

    await expect(page).toHaveURL(
      /\/cucumber\/cpu\/play\?mode=cpu&players=2&cpuLevel=easy&turnSeconds=0$/,
    );
  });

  test('legacy lobby route redirects to current entry points', async ({ page }) => {
    await page.goto('/lobby/cucumber5?mode=friends');
    await expect(page).toHaveURL('/friend');

    await page.goto('/lobby/cucumber5?mode=cpu');
    await expect(page).toHaveURL('/cucumber/cpu/settings');

    await page.goto('/lobby/cucumber5?mode=public');
    await expect(page).toHaveURL('/online');
  });
});
