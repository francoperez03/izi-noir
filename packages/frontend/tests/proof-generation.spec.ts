import { test, expect } from '@playwright/test';

test.describe('ZK Proof Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WASM initialization (message disappears when ready)
    await page.waitForFunction(() => {
      const initText = document.body.textContent?.includes('Initializing Noir WASM');
      return !initText;
    }, { timeout: 30000 });
  });

  test('generates Barretenberg proof successfully', async ({ page }) => {
    const button = page.getByRole('button', { name: /Barretenberg/i });
    await expect(button).toBeEnabled({ timeout: 30000 });

    // Listen for console logs to debug
    page.on('console', msg => console.log('Browser:', msg.text()));

    await button.click();

    // Wait for result card to appear (look for the result section with backend name)
    const resultCard = page.locator('.bg-gray-800').filter({ hasText: 'barretenberg' });
    await expect(resultCard).toBeVisible({ timeout: 90000 });

    // Verify the proof was verified
    await expect(page.getByText(/Verified:.*Yes/).first()).toBeVisible();

    // Verify typical Barretenberg proof size (~16KB)
    const sizeText = await page.getByText(/Size:/).first().textContent();
    const size = parseInt(sizeText?.match(/(\d+)/)?.[1] || '0');
    expect(size).toBeGreaterThan(10000); // > 10KB
  });

  test('generates Arkworks proof successfully', async ({ page }) => {
    const button = page.getByRole('button', { name: /Arkworks/i });
    await expect(button).toBeEnabled({ timeout: 30000 });

    // Listen for console logs to debug
    page.on('console', msg => console.log('Browser:', msg.text()));

    await button.click();

    // Wait for result card to appear
    const resultCard = page.locator('.bg-gray-800').filter({ hasText: 'arkworks' });
    await expect(resultCard).toBeVisible({ timeout: 120000 });

    // Verify the proof was verified
    await expect(page.getByText(/Verified:.*Yes/).first()).toBeVisible();

    // Verify Groth16 proof size (~256 bytes)
    const sizeText = await page.getByText(/Size:/).first().textContent();
    const size = parseInt(sizeText?.match(/(\d+)/)?.[1] || '0');
    expect(size).toBeLessThan(1000); // < 1KB
  });
});
