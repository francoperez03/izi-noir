import { test, expect, devices } from '@playwright/test';

const viewports = [
  { name: 'Mobile', ...devices['iPhone 12'].viewport },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1280, height: 800 },
];

test.describe('Responsive Layout Tests', () => {
  for (const vp of viewports) {
    test(`landing page renders correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width!, height: vp.height! });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify no horizontal page overflow
      const hasPageOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);
    });

    test(`workflow section renders on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width!, height: vp.height! });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Scroll to workflow section
      await page.locator('.section-workflow').scrollIntoViewIfNeeded();

      // Wait for animations
      await page.waitForTimeout(1500);

      // Check all workflow steps are visible (5 steps: Init, Write, Prove, Deploy, Verify)
      const steps = page.locator('.section-workflow .workflow-step');
      await expect(steps).toHaveCount(5);

      for (let i = 0; i < 5; i++) {
        await expect(steps.nth(i)).toBeVisible();
      }
    });

    test(`demo page renders correctly on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width!, height: vp.height! });
      await page.goto('/demo');
      await page.waitForLoadState('networkidle');

      // Wait for WASM init
      await page.waitForTimeout(2000);

      // Verify no horizontal overflow
      const hasPageOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      expect(hasPageOverflow).toBe(false);

      // Check editor panels are visible
      const panels = page.locator('.editor-panel');
      const count = await panels.count();
      expect(count).toBeGreaterThan(0);
    });
  }
});
