import { test, expect } from '@playwright/test'

test.describe('Python flavor', () => {
    // v86 initramfs boot time varies heavily on CI/local load.
    test.use({ timeout: 180_000 })

    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('Python flavor is the default selection', async ({ page }) => {
        await expect(page.getByLabel('Flavor')).toHaveValue('python')
    })

    test('boot Python flavor → banner and version appear', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        const terminal = page.getByTestId('terminal')
        await expect(terminal).toBeVisible()

        // Our custom init prints this banner before dropping to sh.
        await expect(terminal.locator('.xterm-rows')).toContainText(
            'yousandbox.com -- Python & Data',
            { timeout: 120_000 },
        )

        // init also runs `python3 --version 2>&1`
        await expect(terminal.locator('.xterm-rows')).toContainText('Python 3', {
            timeout: 5_000,
        })
    })

    test('import pandas produces ok', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        const terminal = page.getByTestId('terminal')

        // Wait for the shell to be ready (banner appears after init finishes)
        await expect(terminal.locator('.xterm-rows')).toContainText(
            'yousandbox.com -- Python & Data',
            { timeout: 120_000 },
        )
        await expect(terminal.locator('.xterm-rows')).toContainText('Python 3', {
            timeout: 30_000,
        })

        // Focus the terminal and send the command
        await terminal.click()
        await page.keyboard.type("python3 -c \"import pandas; print('ok')\"")
        await page.keyboard.press('Enter')

        // 'ok' should appear within 30s
        await expect(terminal.locator('.xterm-rows')).toContainText('ok', { timeout: 60_000 })
    })

    test('python initramfs downloads within 10s on simulated 50 Mbps', async ({ page }) => {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 40,
            // 50 Mbps ~= 6.25 MB/s
            downloadThroughput: (50 * 1024 * 1024) / 8,
            uploadThroughput: (10 * 1024 * 1024) / 8,
            connectionType: 'wifi',
        })

        let initramfsStartedAt: number | null = null
        let initramfsDurationMs: number | null = null

        page.on('request', (request) => {
            if (request.url().endsWith('/v86/initramfs-python')) {
                initramfsStartedAt = Date.now()
            }
        })

        page.on('requestfinished', (request) => {
            if (request.url().endsWith('/v86/initramfs-python') && initramfsStartedAt !== null) {
                initramfsDurationMs = Date.now() - initramfsStartedAt
            }
        })

        await page.getByTestId('boot-button').click()

        await expect
            .poll(() => initramfsDurationMs, { timeout: 30_000 })
            .not.toBeNull()

        expect(initramfsDurationMs as number).toBeLessThanOrEqual(10_000)
    })
})
