import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/home');
    
    // Navigate to stats
    await page.click('a[href="/stats"]');
    await expect(page).toHaveURL('/stats');
    await expect(page.locator('h1')).toContainText('統計');
    
    // Navigate to settings
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toContainText('設定');
    
    // Navigate back to home
    await page.click('a[href="/home"]');
    await expect(page).toHaveURL('/home');
    await expect(page.locator('h1')).toContainText('ようこそ');
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/home');
    
    // Check if mobile menu toggle is visible
    await expect(page.locator('.header-menu-toggle')).toBeVisible();
    
    // Open mobile menu
    await page.click('.header-menu-toggle');
    await expect(page.locator('.header-mobile-menu')).toBeVisible();
    
    // Navigate using mobile menu
    await page.click('.mobile-nav-link[href="/stats"]');
    await expect(page).toHaveURL('/stats');
    
    // Menu should close after navigation
    await expect(page.locator('.header-mobile-menu')).not.toBeVisible();
  });

  test('should maintain active state in navigation', async ({ page }) => {
    await page.goto('/home');
    
    // Check home link is active
    await expect(page.locator('a[href="/home"]')).toHaveClass(/nav-link--active/);
    
    // Navigate to stats
    await page.click('a[href="/stats"]');
    await expect(page.locator('a[href="/stats"]')).toHaveClass(/nav-link--active/);
    await expect(page.locator('a[href="/home"]')).not.toHaveClass(/nav-link--active/);
  });
});
