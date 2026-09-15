import { test, expect } from '@playwright/test';

test.describe('Remix Lab smoke tests', () => {
  test('lab loads at /', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SoundSauce/);
    await expect(page.locator('text=Upload Audio')).toBeVisible();
  });

  test('/analyze redirects to the lab', async ({ page }) => {
    await page.goto('/analyze');
    await expect(page).toHaveURL(/\/$/);
  });

  test('settings page accessible', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveTitle(/Settings/);
  });

  test('vault and calculator pages load', async ({ page }) => {
    await page.goto('/vault');
    await expect(page).toHaveTitle(/Vault/);
    await page.goto('/calc');
    await expect(page).toHaveTitle(/Calculator/);
  });

  test('helper guide opens from the floating icon', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Show tips' }).click({ force: true }); // the icon idles on an infinite animation
    await page.getByRole('tab', { name: 'What does this do?' }).click();
    await expect(page.getByRole('button', { name: /Stems ready/ })).toBeVisible();
  });

  test('lab lock opens the sign-in dialog', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
