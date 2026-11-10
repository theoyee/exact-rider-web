import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: true, retries: 0,
  use: { baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100', trace: 'retain-on-failure', screenshot: 'only-on-failure', channel: process.env.CHROME_PATH ? undefined : 'chrome', launchOptions: { executablePath: process.env.CHROME_PATH, args: process.platform === 'linux' ? ['--no-sandbox'] : [] } },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
