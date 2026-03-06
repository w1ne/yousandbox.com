import { test, expect } from '@playwright/test'

test.describe('4-pane layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/')
    })

    test('page loads and all panes are visible', async ({ page }) => {
        await expect(page.getByTestId('pane-files')).toBeVisible()
        await expect(page.getByTestId('pane-editor')).toBeVisible()
        await expect(page.getByTestId('pane-preview')).toBeVisible()
        await expect(page.getByTestId('pane-terminal')).toBeVisible()
    })

    test('editor is visible and accepts keyboard input', async ({ page }) => {
        const editorTextarea = page
            .getByTestId('pane-editor')
            .locator('textarea.inputarea')
        await expect(editorTextarea).toBeVisible({ timeout: 15_000 })

        await editorTextarea.focus()
        await page.keyboard.type('print("hello")')

        await expect(
            page.getByTestId('pane-editor').locator('.view-line').first(),
        ).toContainText('print')
    })

    test('preview pane shows placeholder text', async ({ page }) => {
        await expect(page.getByTestId('preview-pane')).toContainText(
            'Run your code to see output here',
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
        await expect(editorArea.locator('textarea.inputarea')).toBeVisible({ timeout: 15_000 })
        const container = editorArea.locator('[data-mode-id]')
        await expect(container).toHaveAttribute('data-mode-id', 'python', { timeout: 10_000 })
    })
})

test.describe('v86 engine boot', () => {
    test.beforeEach(async ({ page }) => {
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

    test('terminal shows shell prompt within 45s after boot', async ({ page }) => {
        await page.getByTestId('boot-button').click()

        // Wait for the xterm canvas/rows to appear with a shell prompt character
        const terminal = page.getByTestId('terminal')
        await expect(terminal).toBeVisible()

        // v86 outputs to xterm which renders to canvas; the accessible text rows
        // contain the shell prompt once Linux has fully booted.
        await expect(terminal.locator('.xterm-rows')).toContainText('$', {
            timeout: 45_000,
        })
    })
})
