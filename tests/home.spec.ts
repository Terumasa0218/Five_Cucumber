import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should display home page with game tiles', async ({ page }) => {
    await page.goto('/home');
    
    // Check if the page loads
    await expect(page).toHaveTitle(/Five Cucumber/);
    
    // Check for main elements
    await expect(page.locator('h1')).toContainText('ようこそ');
    await expect(page.locator('[data-testid="presence-badge"]')).toBeVisible();
    
    // Check for game tile
    await expect(page.locator('.game-tile')).toBeVisible();
    await expect(page.locator('.game-tile__name')).toContainText('５本のきゅうり');
  });

  test('should filter games by player count', async ({ page }) => {
    await page.goto('/home');
    
    // Change player count
    await page.selectOption('select[id="playerCount"]', '2');
    
    // Check if game is still visible (cucumber5 supports 2-6 players)
    await expect(page.locator('.game-tile')).toBeVisible();
    
    // Change to unsupported player count
    await page.selectOption('select[id="playerCount"]', '1');
    
    // Check if no games message appears
    await expect(page.locator('.no-games')).toBeVisible();
  });

  test('should navigate to lobby when clicking play', async ({ page }) => {
    await page.goto('/home');
    
    // Click play button
    await page.click('.game-tile .btn--primary');
    
    // Should navigate to lobby
    await expect(page).toHaveURL(/\/lobby\/cucumber5/);
  });
});
