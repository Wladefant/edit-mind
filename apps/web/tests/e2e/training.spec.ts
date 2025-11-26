import { test, expect } from '@playwright/test'

test.describe('Face Training Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/training')
    await page.waitForLoadState('networkidle')
  })
  test('should display Face Training title', async ({ page }) => {
    await expect(page.getByText('Face Training').first()).toBeVisible()
  })

  test('should display tab navigation', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Unknown/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Known/ })).toBeVisible()
  })
})
