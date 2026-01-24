import { test, expect } from '@playwright/test';

test.describe('PipelineCardStack', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to the pipeline section
    await page.locator('.section-pipeline-demos').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  });

  test('can navigate through all cards with buttons', async ({ page }) => {
    const transformBtn = page.getByRole('button', { name: /transform/i });
    const resetBtn = page.getByRole('button', { name: /reset/i });

    // Initially on stage 1/5
    await expect(page.getByText('1 / 5')).toBeVisible();

    // Click through all stages
    for (let i = 1; i < 5; i++) {
      await transformBtn.click();
      await page.waitForTimeout(1200); // Wait for animation
      await expect(page.getByText(`${i + 1} / 5`)).toBeVisible();
    }

    // Should be on final stage
    await expect(page.getByText('ZK Proof')).toBeVisible();
    await expect(transformBtn).toBeDisabled();

    // Reset and verify back to start
    await resetBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('1 / 5')).toBeVisible();
  });

  test('can drag cards to advance', async ({ page }) => {
    const firstCard = page.locator('[class*="stack-card-js"]');

    // Get card position
    const box = await firstCard.boundingBox();
    if (!box) throw new Error('Card not found');

    // Drag right to advance
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();

    // Wait for animation
    await page.waitForTimeout(1500);

    // Should have advanced to stage 2
    await expect(page.getByText('2 / 5')).toBeVisible();
  });

  test('shows transformer overlay during transition', async ({ page }) => {
    const transformBtn = page.getByRole('button', { name: /transform/i });

    // Click transform
    await transformBtn.click();

    // Transformer overlay should appear
    await expect(page.getByText('Acorn Parser')).toBeVisible();

    // Wait for animation to complete
    await page.waitForTimeout(1500);

    // Now on stage 2
    await expect(page.getByText('2 / 5')).toBeVisible();
  });

  test('all cards have unique colors', async ({ page }) => {
    const transformBtn = page.getByRole('button', { name: /transform/i });
    const stageLabels = ['JavaScript', 'Noir', 'ACIR', 'R1CS', 'ZK Proof'];

    for (let i = 0; i < 5; i++) {
      // Check that current stage label is visible
      const labelElement = page.locator('.text-xs.uppercase.tracking-widest.font-bold').first();
      await expect(labelElement).toContainText(stageLabels[i]);

      if (i < 4) {
        await transformBtn.click();
        await page.waitForTimeout(1200);
      }
    }
  });

  test('reset button goes back to first stage', async ({ page }) => {
    const transformBtn = page.getByRole('button', { name: /transform/i });
    const resetBtn = page.getByRole('button', { name: /reset/i });

    // Advance a few stages
    await transformBtn.click();
    await page.waitForTimeout(1200);
    await transformBtn.click();
    await page.waitForTimeout(1200);

    // Should be on stage 3
    await expect(page.getByText('3 / 5')).toBeVisible();

    // Reset
    await resetBtn.click();
    await page.waitForTimeout(500);

    // Back to stage 1
    await expect(page.getByText('1 / 5')).toBeVisible();
  });

  test('shows final stage badges', async ({ page }) => {
    const transformBtn = page.getByRole('button', { name: /transform/i });

    // Navigate to final stage
    for (let i = 0; i < 4; i++) {
      await transformBtn.click();
      await page.waitForTimeout(1200);
    }

    // Should show Groth16 and Solana-ready badges
    await expect(page.getByText('Groth16')).toBeVisible();
    await expect(page.getByText('Solana-ready')).toBeVisible();
  });
});
