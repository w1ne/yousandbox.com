import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    timeout: 180_000, // v86 boot is highly variable; allow room for initramfs + command checks
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'on-first-retry',
        // Each test gets a clean storage state — no OPFS cross-contamination
        storageState: undefined,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: 'npm run build && npm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
})
