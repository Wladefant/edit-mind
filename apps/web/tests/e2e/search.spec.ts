import { test, expect } from '@playwright/test'

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/search')
    await page.waitForLoadState('networkidle')
  })
  test('should display search hero when not focused and no query', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What are you looking for?' })).toBeVisible()
    await expect(page.getByText('Search by face, object, location, or even what was said')).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search videos' })
    await expect(searchInput).toBeVisible()
    await expect(searchInput).toHaveAttribute('placeholder', 'Search for anything...')
  })

  test('should display empty state message initially', async ({ page }) => {
    await expect(page.getByText('Search your videos')).toBeVisible()
    await expect(
      page.getByText("Start typing in the search box to quickly find the video you're looking for.")
    ).toBeVisible()
  })

  test('should hide search hero and show search input focused on click', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Search videos' })
    await searchInput.click()
    await expect(page.getByRole('heading', { name: 'What are you looking for?' })).not.toBeVisible()
    await expect(searchInput).toBeFocused()
  })
})
