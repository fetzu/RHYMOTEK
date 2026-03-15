import { test, expect } from '@playwright/test';

test.describe('Verse pages', () => {
  test('renders verse text with clickable words', async ({ page }) => {
    await page.goto('/verse/concrete-poetry-v1');
    await expect(page.locator('[data-verse]')).toBeVisible();

    const words = page.locator('[data-word-id]');
    await expect(words.first()).toBeVisible();
    expect(await words.count()).toBeGreaterThan(0);
  });

  test('shows header with navigation', async ({ page }) => {
    await page.goto('/verse/concrete-poetry-v1');
    await expect(page.locator('a[href="/search"]')).toBeVisible();
    await expect(page.locator('a[href="/random"]')).toBeVisible();
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('shows artist and title in footer', async ({ page }) => {
    await page.goto('/verse/concrete-poetry-v1');
    await expect(page.locator('footer')).toContainText('Demo Artist');
    await expect(page.locator('footer')).toContainText('Concrete Poetry');
  });

  test('has JSON-LD structured data', async ({ page }) => {
    await page.goto('/verse/concrete-poetry-v1');
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();
    const content = await jsonLd.textContent();
    const data = JSON.parse(content!);
    expect(data['@type']).toBe('CreativeWork');
    expect(data.author.name).toBe('Demo Artist');
  });
});

test.describe('Home page', () => {
  test('lists all verses', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('RHYMOTEK');
    await expect(page.getByText('Concrete Poetry')).toBeVisible();
    await expect(page.getByText('Midnight Frequencies')).toBeVisible();
  });

  test('shows artist and tag sections', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Artists' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tags' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Demo Artist', exact: true })).toBeVisible();
  });

  test('has search and random links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Search' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Random Verse' })).toBeVisible();
  });
});

test.describe('Artist pages', () => {
  test('shows verses for artist', async ({ page }) => {
    await page.goto('/artist/demo-artist');
    await expect(page.locator('h1')).toContainText('Demo Artist');
    await expect(page.getByText('Concrete Poetry')).toBeVisible();
  });
});

test.describe('Tag pages', () => {
  test('shows verses for tag', async ({ page }) => {
    await page.goto('/tag/demo');
    await expect(page.locator('h1')).toContainText('#demo');
    await expect(page.getByText('Concrete Poetry')).toBeVisible();
    await expect(page.getByText('Midnight Frequencies')).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('shows 404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/nonexistent-page');
    expect(response?.status()).toBe(404);
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible();
  });
});

test.describe('Search page', () => {
  test('renders search interface', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('h1')).toContainText('Search Verses');
    await expect(page.locator('#search')).toBeAttached();
  });
});
