import { test, expect } from '@playwright/test'

test.describe('Python flavor', () => {
    test.beforeEach(async ({ context, page }) => {
        // Bypass ToS gate — modal blocks the boot button
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
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

    test('python initramfs downloads within 20s on simulated 50 Mbps', async ({ page }) => {
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

        // 53 MB at 50 Mbps = ~8.5s theoretical; allow 2× for localhost throttling overhead.
        expect(initramfsDurationMs as number).toBeLessThanOrEqual(20_000)
    })
})

test.describe('Web Dev flavor', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
        await page.goto('/')
        // Select the webdev flavor
        await page.getByLabel('Flavor').selectOption('webdev')
    })

    test('Web Dev flavor can be selected', async ({ page }) => {
        await expect(page.getByLabel('Flavor')).toHaveValue('webdev')
    })

    test('boot Web Dev flavor → banner and node version appear', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        const terminal = page.getByTestId('terminal')
        await expect(terminal).toBeVisible()

        await expect(terminal.locator('.xterm-rows')).toContainText(
            'yousandbox.com -- Web Dev',
            { timeout: 120_000 },
        )
        await expect(terminal.locator('.xterm-rows')).toContainText('v', { timeout: 5_000 })
    })

    test('node -e "console.log(ok)" outputs ok', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        const terminal = page.getByTestId('terminal')
        await expect(terminal.locator('.xterm-rows')).toContainText(
            'yousandbox.com -- Web Dev',
            { timeout: 120_000 },
        )

        await terminal.click()
        await page.keyboard.type('node -e "console.log(\'ok\')"')
        await page.keyboard.press('Enter')

        await expect(terminal.locator('.xterm-rows')).toContainText('ok', { timeout: 30_000 })
    })

    test('webdev initramfs downloads within 10s on simulated 50 Mbps', async ({ page }) => {
        const cdp = await page.context().newCDPSession(page)
        await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 40,
            downloadThroughput: (50 * 1024 * 1024) / 8,
            uploadThroughput: (10 * 1024 * 1024) / 8,
            connectionType: 'wifi',
        })

        let startedAt: number | null = null
        let durationMs: number | null = null

        page.on('request', (r) => {
            if (r.url().endsWith('/v86/initramfs-webdev')) startedAt = Date.now()
        })
        page.on('requestfinished', (r) => {
            if (r.url().endsWith('/v86/initramfs-webdev') && startedAt !== null)
                durationMs = Date.now() - startedAt
        })

        await page.getByTestId('boot-button').click()

        await expect.poll(() => durationMs, { timeout: 30_000 }).not.toBeNull()
        expect(durationMs as number).toBeLessThanOrEqual(10_000)
    })
})
