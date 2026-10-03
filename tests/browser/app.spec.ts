import { test, expect } from '@playwright/test';
test('private fitness flows and responsive views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByLabel('Email address').fill('alex@fittrio.local');
  await page.getByLabel('Password', { exact: true }).fill('FitTrio-Demo-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep going, Alex.' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByText('Calendar', { exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Your consistency calendar.' })).toBeVisible();
  await page.getByRole('button', { name: 'Previous month' }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await page.goto('/log');
  await page.getByLabel('Calories eaten').fill('1700');
  await page.getByLabel(/^Weight/).fill('91.2');
  await page.getByRole('button', { name: 'Save check-in' }).click();
  await expect(page.getByText('Your check-in is saved. Keep going.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Calories eaten')).toHaveValue('1700');
  await page.goto('/workouts');
  await page.getByRole('button', { name: 'Add workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Browser verification');
  await page.getByLabel('Exercise name', { exact: true }).fill('Bench press');
  await page.getByRole('button', { name: 'Save workout' }).click();
  await expect(
    page.getByRole('heading', { name: 'Browser verification', exact: true }),
  ).toBeVisible();
  await page.goto('/weight');
  await page.getByLabel('New weight').fill('91');
  await page.getByRole('button', { name: 'Save weight' }).click();
  await expect(page.getByText('Weigh-in saved.')).toBeVisible();
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'See what’s working.' })).toBeVisible();
  await page.getByRole('button', { name: 'Monthly', exact: true }).click();
  await page.goto('/settings');
  await page.getByLabel('Appearance').selectOption('dark');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Appearance').selectOption('light');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/group');
  await expect(page.getByRole('heading', { name: 'Your small circle.' })).toBeVisible();
  for (const width of [320, 360, 375, 390, 414, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/',
      '/calendar',
      '/log',
      '/workouts',
      '/weight',
      '/analytics',
      '/settings',
      '/group',
    ]) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${route} at ${width}px should fit`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Keep going, Alex.' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Weight chart showing/ })).toBeVisible();
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
