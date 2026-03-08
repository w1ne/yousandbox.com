import { test, expect } from '@playwright/test'

test.describe('Preview port forwarding', () => {
    test.beforeEach(async ({ context, page }) => {
        // Bypass ToS gate
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
        await page.goto('/')
    })

    test('Refresh button is disabled before boot', async ({ page }) => {
        await expect(page.getByTestId('preview-refresh')).toBeDisabled()
    })

    test('port input defaults to 8080', async ({ page }) => {
        await expect(page.getByTestId('preview-port-input')).toHaveValue('8080')
    })

    test('Refresh button enables after boot and shows iframe after HTTP response', async ({
        page,
    }) => {
        // Boot the sandbox
        await page.getByTestId('boot-button').click()
        const terminal = page.getByTestId('terminal')
        await expect(terminal.locator('.xterm-rows')).toContainText('yousandbox.com', {
            timeout: 120_000,
        })

        // Refresh button should now be enabled
        await expect(page.getByTestId('preview-refresh')).toBeEnabled()

        // Start the Python HTTP server inside the sandbox
        await terminal.click()
        await page.keyboard.type('python3 -m http.server 8080 &\r')

        // Wait a moment for the server to bind
        await page.waitForTimeout(3_000)

        // Click Refresh — should fetch via ttyS1 bridge and render an iframe
        await page.getByTestId('preview-refresh').click()

        // The iframe should appear with the directory listing
        await expect(page.getByTestId('preview-iframe')).toBeVisible({ timeout: 15_000 })
    })
})
