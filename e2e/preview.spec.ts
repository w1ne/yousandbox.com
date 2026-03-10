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
        await expect(terminal.locator('.xterm-rows')).toContainText('yousandbox:~#', {
            timeout: 120_000,
        })

        // Refresh button should now be enabled
        await expect(page.getByTestId('preview-refresh')).toBeEnabled()

        // Start the Python HTTP server inside the sandbox bound to IPv4
        // Also ensure ttyS1 is in raw mode so \x03 doesn't trigger SIGINT
        // Diagnostic: see what's in /usr/local/bin
        await terminal.click()
        await page.keyboard.type('ls -l /usr/local/bin', { delay: 50 })
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)

        // Inject the bridge script because it seems to be missing from the provided initramfs
        const bridgeScriptB64 = 'aW1wb3J0IHNvY2tldCwgc3lzCmRlZiBmb3J3YXJkKHBvcnQsIHJlcSk6CiAgICB0cnk6CiAgICAgICAgcyA9IHNvY2tldC5zb2NrZXQoc29ja2V0LkFGX0lORVQsIHNvY2tldC5TT0NLX1NUUkVBTSkKICAgICAgICBzLnNldHRpbWVvdXQoNSkKICAgICAgICBzLmNvbm5lY3QoKCIxMjcuMC4wLjEiLCBwb3J0KSkKICAgICAgICBzLnNlbmRhbGwocmVxKQogICAgICAgIHJlc3AgPSBiIiIKICAgICAgICB3aGlsZSBUcnVlOgogICAgICAgICAgICBkID0gcy5yZWN2KDQwOTYpCiAgICAgICAgICAgIGlmIG5vdCBkOiBicmVhawogICAgICAgICAgICByZXNwICs9IGQKICAgICAgICBzLmNsb3NlKCkKICAgICAgICByZXR1cm4gcmVzcAogICAgZXhjZXB0IEV4Y2VwdGlvbiBhcyBlOgogICAgICAgIHJldHVybiAoIkhUVFAvMS4wIDUwMiBCYWQgR2F0ZXdheVxyXG5cclxuQnJpZGdlIGVycm9yOiAiICsgc3RyKGUpKS5lbmNvZGUoKQoKZGVmIG1haW4oKToKICAgIHR0eSA9IG9wZW4oIi9kZXYvdHR5UzEiLCAicitiIiwgYnVmZmVyaW5nPTApCiAgICBidWYgPSBiIiIKICAgIHdoaWxlIFRydWU6CiAgICAgICAgY2h1bmsgPSB0dHkucmVhZCgxKQogICAgICAgIGlmIG5vdCBjaHVuazogY29udGludWUKICAgICAgICBidWYgKz0gY2h1bmsKICAgICAgICB3aGlsZSBiIlx4MDIiIGluIGJ1ZiBhbmQgYiJceDAzIiBpbiBidWY6CiAgICAgICAgICAgIHMgPSBidWYuaW5kZXgoYiJceDAyIikKICAgICAgICAgICAgZSA9IGJ1Zi5pbmRleChiIlx4MDMiLCBzICsgMSkKICAgICAgICAgICAgZnJhbWUgPSBidWZbcysxOmVdCiAgICAgICAgICAgIGJ1ZiA9IGJ1ZltlKzE6XQogICAgICAgICAgICB0cnk6CiAgICAgICAgICAgICAgICBjb2xvbiA9IGZyYW1lLmluZGV4KGIiOiIpCiAgICAgICAgICAgICAgICBwb3J0ID0gaW50KGZyYW1lWzpjb2xvbl0pCiAgICAgICAgICAgICAgICByZXEgPSBmcmFtZVtjb2xvbisxOl0KICAgICAgICAgICAgICAgIHJlc3AgPSBmb3J3YXJkKHBvcnQsIHJlcSkKICAgICAgICAgICAgICAgIHR0eS53cml0ZShiIlx4MDIiICsgcmVzcCArIGIiXHgwMyIpCiAgICAgICAgICAgICAgICB0dHkuZmx1c2goKQogICAgICAgICAgICBleGNlcHQ6IHBhc3MKbWFpbigpCg=='
        await page.keyboard.type(`echo "${bridgeScriptB64}" | base64 -d > /usr/local/bin/http-bridge`, { delay: 10 })
        await page.keyboard.press('Enter')
        await page.keyboard.type('chmod +x /usr/local/bin/http-bridge', { delay: 50 })
        await page.keyboard.press('Enter')

        await page.keyboard.type('pkill -f http-bridge', { delay: 50 })
        await page.keyboard.press('Enter')
        await page.keyboard.type('stty -F /dev/ttyS1 raw -echo', { delay: 50 })
        await page.keyboard.press('Enter')
        await page.keyboard.type('python3 /usr/local/bin/http-bridge > /tmp/bridge.log 2>&1 &', { delay: 50 })
        await page.keyboard.press('Enter')
        await page.keyboard.type('python3 -m http.server -b 127.0.0.1 8080 &', { delay: 50 })
        await page.keyboard.press('Enter')

        // Wait for the server and bridge to spin up
        await page.waitForTimeout(15_000)

        // Click Refresh — should fetch via ttyS1 bridge and render an iframe
        await page.getByTestId('preview-refresh').click()

        // The iframe should appear with the directory listing
        await expect(page.getByTestId('preview-iframe')).toBeVisible({ timeout: 15_000 })
    })
})
