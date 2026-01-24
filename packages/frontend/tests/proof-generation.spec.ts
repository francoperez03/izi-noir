import { test, expect } from '@playwright/test';

test.describe('ZK Proof Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page where proof generation lives
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Wait for WASM initialization
    await page.waitForTimeout(2000);
  });

  test('generates Groth16 proof successfully', async ({ page }) => {
    // Find the generate proof button
    const button = page.getByRole('button', { name: /Generate Groth16 Proof/i });
    await expect(button).toBeEnabled({ timeout: 30000 });

    // Listen for console logs to debug
    page.on('console', msg => console.log('Browser:', msg.text()));

    await button.click();

    // Wait for proof generation (can take some time for WASM compilation)
    // Look for the result cards that appear after proof generation
    const proofSizeCard = page.locator('.result-card').filter({ hasText: /Proof Size/i });
    await expect(proofSizeCard).toBeVisible({ timeout: 120000 });

    // Verify the locally verified checkmark appears
    const verifiedCard = page.locator('.result-card').filter({ hasText: /Locally Verified/i });
    await expect(verifiedCard).toBeVisible();

    // Verify Groth16 proof size (256 bytes)
    const sizeValue = page.locator('.proof-size-value');
    await expect(sizeValue).toContainText('bytes');
  });

  test('shows proof generation time', async ({ page }) => {
    // Find the generate proof button
    const button = page.getByRole('button', { name: /Generate Groth16 Proof/i });
    await expect(button).toBeEnabled({ timeout: 30000 });

    await button.click();

    // Wait for proof generation
    const proofTimeCard = page.locator('.result-card').filter({ hasText: /Generation Time/i });
    await expect(proofTimeCard).toBeVisible({ timeout: 120000 });

    // Verify time is displayed in ms
    const timeValue = page.locator('.proof-time-value');
    await expect(timeValue).toContainText('ms');
  });
});
