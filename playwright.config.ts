import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: process.env.FITTRIO_BROWSER_PATH
      ? {
          executablePath: process.env.FITTRIO_BROWSER_PATH,
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--no-zygote',
            '--single-process',
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        }
      : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  reporter: 'list',
});
