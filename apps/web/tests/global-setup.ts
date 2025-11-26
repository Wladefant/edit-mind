import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;

  // Ensure baseURL is defined
  if (!baseURL) {
    throw new Error('baseURL is not defined in Playwright configuration.');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // 1. Navigate to the login page
  await page.goto(`${baseURL}/auth/login`);

  // 2. Fill in the login form (replace with actual test user credentials)
  await page.fill('input[name="email"]', 'admin@example.com'); 
  await page.fill('input[name="password"]', 'admin');

  // 3. Click the login button
  await page.click('button:has-text("Sign In")');

  // 4. Wait for successful login (e.g., redirect to /app/home)
  await page.waitForURL(`${baseURL}/app/home`);

  // 5. Save the storage state (cookies, local storage, etc.)
  await page.context().storageState({ path: storageState as string });

  await browser.close();
}

export default globalSetup;
