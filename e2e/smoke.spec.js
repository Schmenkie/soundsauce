import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SoundSauce/);
  });

  test('navigate to analyze page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Analyze');
    await expect(page).toHaveURL(/\/analyze/);
  });

  test('navigate to discover page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Discover');
    await expect(page).toHaveURL(/\/discover/);
  });

  test('search page accessible', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search/);
  });

  test('analyze page shows upload section', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page.locator('text=Upload Audio')).toBeVisible();
  });
});
