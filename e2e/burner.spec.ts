import { test, expect } from '@playwright/test'

test.describe('Burner sandbox guarantees', () => {
    test('ToS acceptance is wiped after pagehide', async ({ page, context }) => {
        // Accept ToS on first load
        await page.goto('/')
        await page.getByTestId('tos-accept').click()
        await expect(page.getByTestId('tos-modal')).not.toBeVisible()

        // Trigger pagehide (simulates tab close / navigation away)
        await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))

        // Open a new page in the same context — localStorage should be cleared
        const page2 = await context.newPage()
        await page2.goto('/')
        await expect(page2.getByTestId('tos-modal')).toBeVisible()
    })

    test('network isolation: curl is not available in the sandbox', async ({ page, context }) => {
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
        await page.goto('/')
        await page.getByTestId('boot-button').click()

        const terminal = page.getByTestId('terminal')
        await expect(terminal.locator('.xterm-rows')).toContainText('yousandbox.com', {
            timeout: 120_000,
        })

        // curl is not installed in the Python initramfs image
        await terminal.click()
        await page.keyboard.type('curl http://example.com 2>&1; echo exit:$?\r')

        // Either "not found" error or non-zero exit code — no network response
        await expect(terminal.locator('.xterm-rows')).toContainText('exit:', { timeout: 10_000 })
        const termText = await terminal.locator('.xterm-rows').innerText()
        expect(termText).not.toContain('200 OK')
        expect(termText).not.toContain('DOCTYPE')
    })
})
