import { test, expect } from '@playwright/test'

test.describe('Prompt Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/prompt')
    await page.waitForLoadState('networkidle')
  })

  test('should display welcome message and suggestions initially', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'What videos are you looking for?' })).toBeVisible()
    await expect(page.getByText("Describe what you want to see and I'll find the perfect clips for you")).toBeVisible()
    await expect(page.locator('button', { hasText: /scenes with/i }).first()).toBeVisible()
  })

  test('should display chat input', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: 'Send' })
    await expect(sendButton).toBeDisabled()

    const chatInput = page.getByPlaceholder("Describe the video you're looking for...")
    await expect(chatInput).toBeVisible()

    await chatInput.fill('cat running')

    await expect(sendButton).toBeEnabled()
  })
})
