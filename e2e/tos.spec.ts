import { test, expect } from '@playwright/test'

test.describe('ToS gate', () => {
    test.beforeEach(async ({ context }) => {
        // Clear localStorage so each test starts with a fresh ToS state
        await context.addInitScript(() => localStorage.removeItem('ysb_tos_v1'))
    })

    test('shows ToS modal on first visit', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByTestId('tos-modal')).toBeVisible()
    })

    test('hides ToS modal after accepting', async ({ page }) => {
        await page.goto('/')
        await page.getByTestId('tos-accept').click()
        await expect(page.getByTestId('tos-modal')).not.toBeVisible()
    })

    test('does not show ToS modal on second visit after accepting', async ({ page, context }) => {
        // Accept on first visit
        await page.goto('/')
        await page.getByTestId('tos-accept').click()

        // Open a fresh page in the same context (same localStorage)
        const page2 = await context.newPage()
        await page2.goto('/')
        await expect(page2.getByTestId('tos-modal')).not.toBeVisible()
    })

    test('Boot button is accessible after accepting ToS', async ({ page }) => {
        await page.goto('/')
        await page.getByTestId('tos-accept').click()
        await expect(page.getByTestId('boot-button')).toBeVisible()
        await expect(page.getByTestId('boot-button')).toBeEnabled()
    })
})
