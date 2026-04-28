import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 15_000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 10_000,
  },
  projects: [
    { name: 'unit',    testMatch: '**/logic.spec.ts' },
    { name: 'browser', testMatch: '**/e2e.spec.ts',  use: { browserName: 'chromium' } },
  ],
});
