import { test, expect } from '@playwright/test';

test('login flow - success redirects to dashboard', async ({ page }) => {
  await page.route('**/api/auth/login', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, token: 'tok-123' }) })
  );
  await page.goto('/login');
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/\/dashboard/);
});

test('login flow - failure shows error', async ({ page }) => {
  await page.route('**/api/auth/login', route =>
    route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'unauthorized' }) })
  );
  await page.goto('/login');
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'wrong');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[role="alert"]', { timeout: 5000 });
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
