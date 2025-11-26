import { test, expect } from '@playwright/test'

test.describe('Authentication Pages', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(page.getByPlaceholder('Email')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByText("Don't have an account? Sign Up")).toBeVisible()
  })
})
