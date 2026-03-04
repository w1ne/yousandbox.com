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
        // Monaco loads asynchronously — wait for the textarea it injects
        const editorTextarea = page
            .getByTestId('pane-editor')
            .locator('textarea.inputarea')
        await expect(editorTextarea).toBeVisible({ timeout: 15_000 })

        await editorTextarea.focus()
        await page.keyboard.type('print("hello")')

        // Monaco keeps value in its model — check the line content element
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
        // No pane should overflow or collapse (all must remain visible)
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

    test('Python syntax is highlighted in the editor', async ({ page }) => {
        // Wait for Monaco to fully initialise
        const editorArea = page.getByTestId('pane-editor')
        await expect(editorArea.locator('textarea.inputarea')).toBeVisible({
            timeout: 15_000,
        })

        // Monaco sets a data-mode-id attribute on its container once the language is loaded
        const container = editorArea.locator('[data-mode-id]')
        await expect(container).toHaveAttribute('data-mode-id', 'python', {
            timeout: 10_000,
        })
    })
})
