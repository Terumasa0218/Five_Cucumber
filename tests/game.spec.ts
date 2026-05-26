import { expect, test } from '@playwright/test';

test.describe('Cucumber5 CPU Game', () => {
  test('starts a CPU match from the current route', async ({ page }) => {
    await page.goto('/cucumber/cpu/play?players=4&turnSeconds=0&maxCucumbers=5&cpuLevel=normal');

    await expect(page).toHaveTitle(/CPU対戦 \| Five Cucumber/);
    await expect(page.locator('.battle-hud')).toContainText('第1回戦');
    await expect(page.locator('.ellipse-table')).toBeVisible();
    await expect(page.locator('#hand-dock')).toBeVisible();
    await expect(page.locator('#seats .seat')).toHaveCount(4);
    await expect(page.locator('#hand-dock .game-card')).toHaveCount(7);
  });

  test('renders supported CPU player counts', async ({ page }) => {
    for (const count of [2, 3, 4, 5, 6]) {
      await page.goto(
        `/cucumber/cpu/play?players=${count}&turnSeconds=0&maxCucumbers=5&cpuLevel=easy`,
      );

      await expect(page.locator('.ellipse-table')).toBeVisible();
      await expect(page.locator('#seats .seat')).toHaveCount(count);
      await expect(page.locator('#seats')).toHaveClass(new RegExp(`players-${count}`));
    }
  });

  test('shows playable cards when it is the human turn', async ({ page }) => {
    await page.goto(
      '/cucumber/cpu/play?players=2&turnSeconds=0&maxCucumbers=6&cpuLevel=easy&seed=5',
    );

    await expect(page.locator('#hand-dock .game-card')).toHaveCount(7);
    await expect(page.locator('#hand-dock .game-card.playable').first()).toBeVisible();
  });
});
