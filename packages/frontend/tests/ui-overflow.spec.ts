import { test, expect } from '@playwright/test';

test.describe('UI Overflow Tests', () => {
  test('landing page has no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const hasOverflow = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('workflow code blocks have no scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to workflow section
    await page.locator('.section-workflow').scrollIntoViewIfNeeded();

    // Wait for animations to settle
    await page.waitForTimeout(1500);

    const preElements = page.locator('.workflow-step pre');
    const count = await preElements.count();

    for (let i = 0; i < count; i++) {
      const hasScroll = await preElements.nth(i).evaluate((el) =>
        el.scrollWidth > el.clientWidth + 2
      );
      expect(hasScroll).toBe(false);
    }
  });

  test('demo page has no horizontal overflow', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Wait for WASM init
    await page.waitForTimeout(2000);

    const hasOverflow = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth
    );
    expect(hasOverflow).toBe(false);
  });

  test('demo page editor content has no unnecessary scroll', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    // Wait for transpilation
    await page.waitForTimeout(3000);

    const editors = page.locator('.editor-content');
    const count = await editors.count();

    for (let i = 0; i < count; i++) {
      const editor = editors.nth(i);
      const isVisible = await editor.isVisible();

      if (isVisible) {
        const scrollDiff = await editor.evaluate((el) =>
          el.scrollWidth - el.clientWidth
        );
        // Allow small tolerance
        expect(scrollDiff).toBeLessThan(5);
      }
    }
  });
});
