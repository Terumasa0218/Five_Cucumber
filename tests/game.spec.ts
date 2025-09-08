import { test, expect } from '@playwright/test';

test.describe('Cucumber5 Game', () => {
  test('should start game with 4 players', async ({ page }) => {
    await page.goto('/play/cucumber5?mode=cpu&players=4&difficulty=normal');
    
    // Wait for game to load
    await page.waitForSelector('.cucumber5-game', { timeout: 10000 });
    
    // Check if game elements are present
    await expect(page.locator('.cucumber5-game')).toBeVisible();
    await expect(page.locator('.game-hud')).toBeVisible();
    await expect(page.locator('.player-hand')).toBeVisible();
    
    // Check for 4 player seats
    const seats = page.locator('.seat');
    await expect(seats).toHaveCount(4);
    
    // Check if seats are positioned correctly (no overlap)
    const seatBoxes = await seats.boundingBox();
    if (seatBoxes) {
      // Basic overlap check - seats should be positioned in a circle
      const centerX = 400; // Approximate center
      const centerY = 300;
      const radius = 200; // Approximate radius
      
      // Check that seats are roughly positioned in a circle
      for (let i = 0; i < 4; i++) {
        const seat = seats.nth(i);
        const box = await seat.boundingBox();
        if (box) {
          const distance = Math.sqrt(
            Math.pow(box.x + box.width/2 - centerX, 2) + 
            Math.pow(box.y + box.height/2 - centerY, 2)
          );
          expect(distance).toBeLessThan(radius + 100); // Allow some tolerance
        }
      }
    }
  });

  test('should handle different player counts', async ({ page }) => {
    const playerCounts = [2, 3, 4, 5, 6];
    
    for (const count of playerCounts) {
      await page.goto(`/play/cucumber5?mode=cpu&players=${count}&difficulty=normal`);
      
      // Wait for game to load
      await page.waitForSelector('.cucumber5-game', { timeout: 10000 });
      
      // Check correct number of seats
      const seats = page.locator('.seat');
      await expect(seats).toHaveCount(count);
      
      // Check that seats don't overlap significantly
      const seatBoxes = await seats.all();
      for (let i = 0; i < seatBoxes.length; i++) {
        for (let j = i + 1; j < seatBoxes.length; j++) {
          const box1 = await seatBoxes[i].boundingBox();
          const box2 = await seatBoxes[j].boundingBox();
          
          if (box1 && box2) {
            // Check for significant overlap (more than 50% of smaller element)
            const overlap = Math.max(0, Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x)) *
                          Math.max(0, Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y));
            
            const smallerArea = Math.min(box1.width * box1.height, box2.width * box2.height);
            const overlapRatio = overlap / smallerArea;
            
            expect(overlapRatio).toBeLessThan(0.5); // Less than 50% overlap
          }
        }
      }
    }
  });

  test('should display game UI elements', async ({ page }) => {
    await page.goto('/play/cucumber5?mode=cpu&players=4&difficulty=normal');
    
    // Wait for game to load
    await page.waitForSelector('.cucumber5-game', { timeout: 10000 });
    
    // Check HUD elements
    await expect(page.locator('.round-indicator')).toBeVisible();
    await expect(page.locator('.timer-display')).toBeVisible();
    await expect(page.locator('.game-title')).toContainText('５本のきゅうり');
    
    // Check center area
    await expect(page.locator('.center-area')).toBeVisible();
    await expect(page.locator('.center-area__field')).toBeVisible();
    await expect(page.locator('.center-area__graveyard')).toBeVisible();
    
    // Check player hand
    await expect(page.locator('.player-hand')).toBeVisible();
    await expect(page.locator('.player-hand__card')).toHaveCount(7); // Initial 7 cards
  });

  test('should handle card interactions', async ({ page }) => {
    await page.goto('/play/cucumber5?mode=cpu&players=4&difficulty=normal');
    
    // Wait for game to load
    await page.waitForSelector('.cucumber5-game', { timeout: 10000 });
    
    // Wait for player's turn
    await page.waitForSelector('.player-hand__card--playable', { timeout: 15000 });
    
    // Click on a playable card
    const playableCard = page.locator('.player-hand__card--playable').first();
    await playableCard.click();
    
    // Check that card was played (field should update)
    await expect(page.locator('.center-area__card--field')).toBeVisible();
  });
});
