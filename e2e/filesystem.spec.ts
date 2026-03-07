import { test, expect } from '@playwright/test'

test.describe('Filesystem Drag & Drop', () => {
    test.beforeEach(async ({ context, page }) => {
        // Bypass ToS gate so it doesn't block the test
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))

        await page.goto('/')
        await page.getByTestId('boot-button').click()

        // Wait until the Python banner appears — indicates init is done and shell is ready
        const terminal = page.getByTestId('terminal')
        await expect(terminal.locator('.xterm-rows')).toContainText('yousandbox.com', {
            timeout: 120_000,
        })
    })

    test('injects a file via drag-drop and it appears in the file tree', async ({ page }) => {
        const fileContent = 'Hello from the host filesystem!\n'

        await page.evaluate((content: string) => {
            const file = new File([content], 'hello.txt', { type: 'text/plain' })
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)

            // Target the outermost container that has the onDrop handler
            const container = document.querySelector('[data-testid="pane-files"]')?.closest('div.relative')
            container?.dispatchEvent(
                new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
            )
        }, fileContent)

        // File name should appear in the file tree once upload completes
        await expect(page.getByTestId('file-tree')).toContainText('hello.txt', { timeout: 30_000 })
    })

    test('injected file is readable via cat in the terminal', async ({ page }) => {
        const fileContent = 'Hello from the host filesystem!\n'

        await page.evaluate((content: string) => {
            const file = new File([content], 'hello.txt', { type: 'text/plain' })
            const dataTransfer = new DataTransfer()
            dataTransfer.items.add(file)

            const container = document.querySelector('[data-testid="pane-files"]')?.closest('div.relative')
            container?.dispatchEvent(
                new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }),
            )
        }, fileContent)

        // Wait for file to appear in tree (upload complete)
        await expect(page.getByTestId('file-tree')).toContainText('hello.txt', { timeout: 30_000 })

        // Click into terminal and cat the file
        await page.getByTestId('terminal').click()
        await page.keyboard.type('cat hello.txt\r')

        await expect(page.getByTestId('terminal').locator('.xterm-rows')).toContainText(
            'Hello from the host filesystem!',
            { timeout: 10_000 },
        )
    })
})
