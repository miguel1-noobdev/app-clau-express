import { test, expect } from '@playwright/test';

test('protected route redirects to login when not authenticated', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});

test('protected route accessible when authenticated', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('authToken', 'token');
  });
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
});
