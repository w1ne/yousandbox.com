import { test, expect } from '@playwright/test'

test.describe('4-pane layout', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
        await page.goto('/')
    })

    test('page loads and all panes are visible', async ({ page }) => {
        await expect(page.getByTestId('pane-files')).toBeVisible()
        await expect(page.getByTestId('pane-editor')).toBeVisible()
        await expect(page.getByTestId('pane-preview')).toBeVisible()
        await expect(page.getByTestId('pane-terminal')).toBeVisible()
    })

    test('editor is visible and accepts keyboard input', async ({ page }) => {
        // Monaco renders inside [data-mode-id]; wait for it to be visible.
        const editorPane = page.getByTestId('pane-editor')
        await expect(editorPane.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 })

        // Click the editor area to focus it, then type.
        await editorPane.locator('.view-lines').click()
        await page.keyboard.type('print("hello")')

        await expect(editorPane.locator('.view-line').first()).toContainText('print')
    })

    test('preview pane shows placeholder text', async ({ page }) => {
        await expect(page.getByTestId('preview-pane')).toContainText(
            'Start a server inside the sandbox, then click Refresh',
        )
    })

    test('layout is stable at 1280px width', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 })
        await expect(page.getByTestId('pane-files')).toBeVisible()
        await expect(page.getByTestId('pane-editor')).toBeVisible()
        await expect(page.getByTestId('pane-preview')).toBeVisible()
    })

    test('layout is stable at 1920px width', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        await expect(page.getByTestId('pane-files')).toBeVisible()
        await expect(page.getByTestId('pane-editor')).toBeVisible()
        await expect(page.getByTestId('pane-preview')).toBeVisible()
    })

    test('Python syntax highlighting is active in the editor', async ({ page }) => {
        const editorArea = page.getByTestId('pane-editor')
        await expect(editorArea.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 })
        const container = editorArea.locator('[data-mode-id]')
        await expect(container).toHaveAttribute('data-mode-id', 'python', { timeout: 10_000 })
    })
})

test.describe('unsupported browser guard', () => {
    test('shows unsupported-browser screen when SharedArrayBuffer is absent', async ({ page }) => {
        await page.addInitScript(() => {
            delete (globalThis as unknown as Record<string, unknown>).SharedArrayBuffer
        })
        await page.goto('/')
        await expect(page.getByTestId('unsupported-browser')).toBeVisible()
    })
})

test.describe('v86 engine boot', () => {
    test.beforeEach(async ({ context, page }) => {
        await context.addInitScript(() => localStorage.setItem('ysb_tos_v1', 'true'))
        await page.goto('/')
    })

    test('Boot button is visible and enabled', async ({ page }) => {
        const btn = page.getByTestId('boot-button')
        await expect(btn).toBeVisible()
        await expect(btn).toBeEnabled()
        await expect(btn).toContainText('Boot')
    })

    test('Boot button transitions to Booting… on click', async ({ page }) => {
        await page.getByTestId('boot-button').click()
        // Should immediately reflect the loading state
        await expect(page.getByTestId('boot-button')).toContainText('Booting…', {
            timeout: 3_000,
        })
    })

    test('terminal shows shell prompt within 120s after boot', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        // Wait for the xterm canvas/rows to appear with a shell prompt character.
        // Default flavor is Python — our custom init prints this banner before dropping to sh.
        // 120s allows for v86 initramfs boot variance under heavy local/CI load.
        const terminal = page.getByTestId('terminal')
        await expect(terminal).toBeVisible()
        await expect(terminal.locator('.xterm-rows')).toContainText('yousandbox.com', {
            timeout: 120_000,
        })
    })
})
