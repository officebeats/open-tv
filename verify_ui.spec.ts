import { test, expect } from '@playwright/test';

test('Verify UI Layout Integration', async ({ page }) => {
  // Navigate to the built application
  await page.goto('http://localhost:8080');

  // Wait for the app to initialize
  await page.waitForSelector('app-root');

  // Check Sidebar visibility and dimensions
  const sidebar = page.locator('.sidebar');
  await expect(sidebar).toBeVisible();

  const sidebarBoundingBox = await sidebar.boundingBox();
  console.log(`Sidebar dimensions: ${sidebarBoundingBox?.width}x${sidebarBoundingBox?.height}`);

  // The sidebar should be narrow (around 90px) but full height
  expect(sidebarBoundingBox?.width).toBeGreaterThan(50);
  expect(sidebarBoundingBox?.width).toBeLessThan(150);

  // Check Logo dimensions (should be fixed height if styling is applied)
  const logo = page.locator('.sidebar-logo-persistent');
  await expect(logo).toBeVisible();
  const logoBox = await logo.boundingBox();
  console.log(`Logo height: ${logoBox?.height}`);

  // If styling failed, the logo would likely take its natural huge size or 0
  // Our CSS says: height: 48px
  expect(logoBox?.height).toBeCloseTo(48, 1);

  // Check Background color (Global style)
  const body = page.locator('body');
  const bgColor = await body.evaluate((el) => window.getComputedStyle(el).backgroundColor);
  console.log(`Body background color: ${bgColor}`);
  expect(bgColor).toBe('rgb(0, 0, 0)');

  // Check if Media Type chips are absent (should be filtered now)
  const chips = page.locator('app-filter-chips .chip-label');
  const chipTexts = await chips.allTextContents();
  console.log(`Filter chips found: ${chipTexts.join(', ')}`);

  const redundant = chipTexts.some((t) => ['Live TV', 'Movies', 'Series'].includes(t));
  expect(redundant, 'Redundant media type chips should not be visible').toBe(false);

  // Check content container alignment
  const content = page.locator('.content-container');
  const contentBox = await content.boundingBox();
  console.log(`Content start x: ${contentBox?.x}`);
  // Content should start right after sidebar (width 90, so x should be 90)
  expect(contentBox?.x).toBeCloseTo(90, 1);
});
