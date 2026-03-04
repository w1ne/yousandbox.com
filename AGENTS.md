# AGENTS.md

> Working on this repo? Start here. For product vision, tech stack, phases, and exit gates → **[PLAN.md](./PLAN.md)**. For legacy dev notes → **[agents.md](./agents.md)**.

---

## Pick Up the Next Task

1. Open `PLAN.md` and find the **first `⬜` item whose dependencies are all `✅`**.
2. Read its exit gate — every checkbox must be satisfiable before the item is done.
3. Do the work on a branch, run the gate checks, open a PR.

---

## Commands

```bash
npm run dev           # Dev server (localhost:5173)
npm run typecheck     # tsc --noEmit
npm run test:run      # Unit tests, single run
npm run test:e2e      # Playwright E2E
npm run lint          # ESLint
npm run build         # Production build
```

**Before every commit:** `npm run typecheck && npm run test:run`

---

## Git Rules

- Branch off `main`: `feat/`, `fix/`, `chore/` prefix
- No direct commits to `main`, no `--no-verify`, no force push
- Squash or rebase merge only (linear history)
- PRs must pass `typecheck` + `test:run` + `test:e2e` before merge

---

## Implementation Order

Write `src/lib/` pure logic first → unit test it → wrap in a hook → wire into a component → E2E only if the exit gate requires it.

Unit tests live next to source (`foo.ts` → `foo.test.ts`). E2E tests live in `e2e/` only. `lib/` must have zero React imports.

---

## Critical Gotchas

- **COOP/COEP headers required** for Wasm threads — set in `vite.config.ts` (dev) and `public/_headers` (production).
- **v86 boot is async (5–30s)** — always use `waitFor`, never hard-coded delays.
- **OPFS is origin-scoped** — give each Playwright test a fresh browser context.
- **No backend, no accounts, no server-side logic** — if it seems to need a server, re-read PLAN.md.
- **No `any` in TypeScript** unless wrapping an untyped third-party Wasm API.
- **No disk images in git** if >100 MB — document the download step instead.

---

## Agent Coding Best Practices

These apply to any AI agent working in this repo.

### Plan before you code

For any task larger than a one-liner fix: write out what you will change and why before touching a file. If the change spans more than two files, ask yourself whether the exit gate is still satisfiable with your approach. If not, stop and re-read PLAN.md.

### One exit gate item per PR

Never batch unrelated exit gate items into one PR. Each PR should close exactly one checkboxable item. This makes CI failures easy to bisect and rollbacks clean.

### Write the test in the same PR

Never open a PR that adds untested logic and plans to "add tests later." The unit test is part of the implementation — write it the moment the function signature is stable.

### Verify before claiming done

Run `npm run typecheck && npm run test:run` yourself before marking a task complete. Do not rely on CI to catch errors you could have caught locally. For E2E items, run `npm run test:e2e` against a real build (`npm run build && npm run preview`).

### Prefer small, pure functions

Put logic in `src/lib/` as pure functions with explicit inputs and outputs. Avoid side effects. Functions that are hard to unit test are a sign the logic is not pure enough — refactor before shipping.

### Mock at the boundary, not deep inside

When a function depends on a browser API (OPFS, IndexedDB, Service Worker), inject the dependency so tests can swap it out. Never call `navigator.storage` directly from inside a helper — wrap it in `src/lib/opfs/` and mock the wrapper.

### Never widen scope mid-task

If you notice something broken that is outside the current exit gate, open a separate issue or branch. Fixing two things in one PR masks the cause of any CI failure.

### Read the exit gate literally

Each checkbox in PLAN.md is a precise acceptance criterion. "Within 45s" means under 45 seconds on the Playwright timeout clock, not "fast enough on my machine." Do not ship until the criterion is literally met by the automated test.

### When stuck, shrink the problem

If an E2E test won't pass, reproduce the failure in a unit test or a REPL snippet first. Wasm boot takes 5–30s per attempt — debugging at the E2E level is expensive. Isolate the broken layer before reaching for the browser.

### Keep this file short

This file exists to give agents a fast start. Add a rule here only when the same mistake has been made more than once. Everything else belongs in PLAN.md or in code comments.
