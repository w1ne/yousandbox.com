# agents.md — Working on yousandbox.com

This file is the source of truth for how to develop, test, and ship code in this repo. Read it before touching anything.

---

## Tech Stack

- **Framework**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor
- **Wasm Linux Engine**: v86 (MIT)
- **Unit/Component Tests**: Vitest + @testing-library/react
- **E2E Tests**: Playwright
- **Package manager**: `npm`

---

## Project Structure

```
yousandbox.com/
├── src/
│   ├── components/          # React UI components (dumb, presentational)
│   │   ├── Editor/
│   │   ├── FileTree/
│   │   ├── Terminal/
│   │   └── Preview/
│   ├── features/            # Feature modules (smart, stateful)
│   │   ├── sandbox/         # Boot, wipe, mode switching
│   │   ├── filesystem/      # OPFS read/write, drag-drop import
│   │   ├── flavors/         # Flavor definitions and image loading
│   │   └── auth/            # GitHub OAuth, session management
│   ├── lib/                 # Pure logic, no React
│   │   ├── engine/          # v86 wrapper and lifecycle
│   │   ├── opfs/            # OPFS abstraction layer
│   │   ├── ports/           # Localhost → iframe port forwarding
│   │   └── quotas/          # CPU/storage quota enforcement
│   ├── store/               # Global state (Zustand or React Context)
│   ├── hooks/               # Shared custom React hooks
│   └── main.tsx
├── e2e/                     # Playwright end-to-end tests
│   ├── boot.spec.ts         # Sandbox boots and reaches shell prompt
│   ├── burner.spec.ts       # Wipe behavior, network isolation
│   ├── filesystem.spec.ts   # Drag-drop, OPFS persistence
│   └── flavors.spec.ts      # Each flavor loads and runs basic commands
├── public/
│   └── wasm/                # v86 engine and Linux images (gitignored if large)
├── PLAN.md
├── agents.md                # This file
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

**Rules:**
- Unit tests live next to their source file: `src/lib/opfs/opfs.ts` → `src/lib/opfs/opfs.test.ts`
- E2E tests live in `e2e/` only
- No business logic in components. Components call hooks or feature functions
- `lib/` is framework-agnostic — no React imports allowed there

---

## Commands

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build
npm run test         # Run unit tests (Vitest, watch mode)
npm run test:run     # Run unit tests once (CI)
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run Playwright with interactive UI
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
```

**Before every commit:** `npm run typecheck && npm run test:run`

---

## Testing Philosophy

### Unit Tests (Vitest)

Test pure logic in `lib/` and `features/`. Do not test implementation details.

**Test these:**
- OPFS abstraction (mock the browser API)
- Flavor config parsing and validation
- Quota calculation logic
- Port-forwarding URL mapping
- Wipe sequence (assert correct APIs are called in order)
- Storage meter byte formatting

**Do not unit test:**
- v86 itself (it's a third-party library)
- React component rendering (use E2E for visual behavior)
- Anything that requires a real browser environment

**Example: testing the wipe sequence**
```ts
// src/lib/engine/wipe.test.ts
import { wipeBurnerSession } from './wipe'

it('clears indexedDB, OPFS origin, and SW cache in order', async () => {
  const calls: string[] = []
  const mocks = {
    clearIndexedDB: vi.fn().mockImplementation(() => { calls.push('idb'); return Promise.resolve() }),
    deleteOPFSOrigin: vi.fn().mockImplementation(() => { calls.push('opfs'); return Promise.resolve() }),
    clearSWCache: vi.fn().mockImplementation(() => { calls.push('sw'); return Promise.resolve() }),
  }
  await wipeBurnerSession(mocks)
  expect(calls).toEqual(['idb', 'opfs', 'sw'])
})
```

### E2E Tests (Playwright)

E2E tests are slow by nature (they boot a real Wasm Linux). Keep the suite focused on critical paths only.

**Test these:**
- Sandbox boots and shell prompt appears within timeout
- A Python command runs and produces correct output
- Burner mode leaves no OPFS data after close
- Drag-and-drop file appears in file tree and terminal
- Network is unreachable in Burner mode
- Persistent Workspace reloads files after page refresh

**Do not E2E test:**
- Every UI state or edge case (that's for unit tests)
- Performance benchmarks (use a separate script)

**E2E timeout budget:** Individual tests must complete in under 60s. Boot tests get 45s for the Wasm kernel to reach shell.

**Example: verifying Python runs**
```ts
// e2e/flavors.spec.ts
test('Python flavor runs a script', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'flavor' }).selectOption('python')
  await page.getByRole('button', { name: 'Boot' }).click()
  await page.getByTestId('terminal').waitFor({ state: 'visible', timeout: 45000 })
  // Wait for shell prompt
  await expect(page.getByTestId('terminal')).toContainText('$', { timeout: 45000 })
  // Type a command
  await page.getByTestId('terminal').type('python3 -c "print(1+1)"\n')
  await expect(page.getByTestId('terminal')).toContainText('2', { timeout: 10000 })
})
```

---

## Browser API Mocking

Many core features rely on browser APIs unavailable in Node (OPFS, IndexedDB, Service Workers). Always mock at the boundary.

Create mocks in `src/lib/__mocks__/browser-apis.ts` and import them in `vitest.setup.ts`. Never let browser API calls reach Vitest directly — tests will fail silently or throw.

---

## Key Constraints

**Wasm engine is async and slow.** v86 boot takes 5–30s. Never await it in synchronous test code. Always use timeouts and `waitFor`.

**OPFS is origin-scoped.** In tests, each Playwright test gets a fresh browser context to avoid cross-test OPFS pollution. Configure this in `playwright.config.ts`:
```ts
use: { storageState: undefined, bypassCSP: false }
```

**SharedArrayBuffer requires COOP/COEP headers.** The dev server and production must serve:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
Without these, Wasm threads silently fail. Add to `vite.config.ts` server headers and the production hosting config.

**No global state between tests.** Each Vitest test file gets its own module scope. Each Playwright test gets a fresh page. Do not share sandbox instances between tests.

---

## Adding a New Feature

1. Write the core logic in `src/lib/` as a pure function with no React dependency
2. Write unit tests for it immediately (`*.test.ts` next to the file)
3. Wrap it in a React hook in `src/hooks/` if the component needs to call it
4. Add an E2E test only if it touches the critical user path (boot, run, wipe, persist)
5. Run `npm run typecheck && npm run test:run` before opening a PR

## Adding a New Flavor

1. Add a config entry in `src/features/flavors/flavors.config.ts`
2. Place the disk image in `public/wasm/images/` (gitignore if >100 MB, document download step)
3. Add a unit test validating the config shape
4. Add an E2E test in `e2e/flavors.spec.ts` that boots the flavor and runs a smoke command

---

## CI Expectations

Every PR must pass:
- `typecheck`
- `test:run` (unit tests)
- `test:e2e` (E2E, runs against production build via `vite preview`)

E2E runs in headed Chromium only (our V1 browser target). Do not run against Firefox or Safari in CI until those are officially supported.
