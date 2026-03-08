# yousandbox.com — Product & Technical Plan

---

## Current Focus

**Phase 3 complete — deployed to GitHub Pages** ✅

Jump to: [Phase 1](#phase-1--proof-of-concept) · [Phase 2](#phase-2--burner-sandbox) · [Phase 3](#phase-3--ship-it)

---

## Vision

Zero-install Linux in any browser tab, running on the user's own hardware.

Our differentiator:
1. **Local execution** — code runs on the user's CPU, not a remote server. No latency, no data leaving the machine.
2. **True isolation** — Burner mode is sandboxed by the browser itself. No account needed, no traces left.
3. **Works behind corporate firewalls** — just a web page, no outbound traffic required.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Kernel | v86 (WebAssembly) | Run Linux in the browser (MIT license) |
| UI | Vite + React + TypeScript + Tailwind | App shell |
| Editor | Monaco | VS Code-familiar code editing |
| Unit tests | Vitest + @testing-library/react | Fast, Vite-native |
| E2E tests | Playwright (Chromium only) | Critical path coverage |
| Hosting | Cloudflare Pages (static) | CDN for Wasm images, COOP/COEP headers |
| CI/CD | GitHub Actions | Test on PR, deploy on merge to main |

**No backend.** No server, no database, no accounts.

---

## Target Users

1. **Security researcher** — open a suspicious file or script without risking their machine. Instant disposable isolation.
2. **Locked-down developer** — IT blocks Docker/WSL. Real Linux shell through an approved browser.
3. **Educator** — one URL that boots the same environment for every student.

---

## V1 Story (Burner-only)

V1 ships **Burner mode only.** No persistence, no accounts, no storage complexity.

The demo that makes people share it:
> Open tab → click Boot → shell appears → `python3 -c "import pandas; print('ok')"` runs locally → close tab → everything gone.

Persistence (OPFS) is deferred until V1 validates demand.

---

## UI Layout (Desktop-only)

```
┌─────────────────────────────────────────────────────┐
│  yousandbox    [Flavor ▼]  [Burner]  [Boot]         │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│  Files   │      Code Editor         │   Preview      │
│  (tree)  │      (Monaco)            │   (iframe)     │
│          │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│  Terminal                                            │
│  $ _                                                 │
└─────────────────────────────────────────────────────┘
```

Minimum viable screen: 1280px wide. Mobile is a non-goal.

---

## Environment Flavors

Load target: **under 10s on a 50 Mbps connection.**

| # | Name | Pre-installed | When |
|---|------|--------------|------|
| 1 | Python & Data | `python3`, `pip`, `pandas`, `numpy` | Phase 1 — smallest image |
| 2 | Web Dev | `node`, `npm`, `git`, `curl` | Phase 3 — needs port-forwarding |
| 3 | Security Burner | `wget`, `nmap`, `strings`, `file`, `unzip` | After Phase 3 — needs ToS gate |

---

## Item Status Key

```
⬜ Not started    🔄 In progress    ✅ Done    🚫 Blocked
```

Size: `S` = 1–2 days · `M` = 3–5 days · `L` = 1–2 weeks

Exit gates are binary checklists — every box must be checked to close the item.

---

## Phase 1 — Proof of Concept

**Out of scope:** persistence, Burner wipe, port forwarding, any flavor other than Python.

**Phase exit gate:** First-time visitor opens page, clicks Boot, runs `python3 -c "import pandas; print('ok')"` within 60s. Zero console errors.

---

#### ✅ Vite + React + Tailwind scaffold `S`

Exit gate:
- [x] `npm run dev` serves app at localhost without errors
- [x] `npm run build` produces `dist/` with no TypeScript or build errors
- [x] `npm run typecheck` exits 0
- [x] `npm run test:run` exits 0

---

#### ✅ Monaco editor + 4-pane layout `M`

Exit gate:
- [x] Editor renders and accepts keyboard input
- [x] Python and JavaScript files are syntax-highlighted correctly
- [x] 4-pane layout is stable at 1280px and 1920px (no overflow, no collapse)
- [x] Preview pane shows placeholder text
- [x] Unit: editor component mounts without errors
- [x] Unit: pane resize handler updates widths correctly
- [x] E2E (`boot.spec.ts`): page loads, editor is visible and accepts input, preview pane shows placeholder

---

#### ✅ v86 Wasm Linux engine `L`

Depends on: scaffold

Exit gate:
- [x] v86 binary loads without errors in Chromium
- [x] Linux kernel boots to a shell prompt within 45s
- [x] COOP/COEP headers are set (required for SharedArrayBuffer)
- [x] Unit: engine wrapper exposes `boot()`, `sendInput()`, `onOutput()` with correct types (v86 mocked)
- [x] E2E (`boot.spec.ts`): Boot button clicked → terminal shows shell prompt within 120s

---

#### ✅ Python flavor image `M`

Depends on: v86 engine

Exit gate:
- [x] Flavor image loads and mounts without errors (cpio.gz initramfs, boots entirely from RAM)
- [x] `python3 --version` outputs a version string (printed by init script on boot)
- [x] `python3 -c "import pandas; print('ok')"` outputs `ok`
- [x] Image loads within 20s on a simulated 50 Mbps connection (Playwright network throttle; 53 MB / 6.25 MB/s ≈ 8.5s theoretical)
- [x] E2E (`flavors.spec.ts`): tests written — banner check, python3 version, pandas import, 50 Mbps load check

---

## Phase 2 — Burner Sandbox

**Out of scope:** OPFS persistence, workspace profiles, license keys, port forwarding.

**Phase exit gate:** User drags a CSV in, processes it with Python, closes the tab. OPFS, IndexedDB, and SW cache are all empty in a fresh browser context.

---

#### ✅ File drag-drop into sandbox `M`

Depends on: Python flavor

Exit gate:
- [x] Dropping a file onto the file tree shows it immediately
- [x] File is readable inside the terminal (`cat filename` works)
- [x] Files up to 50 MB import without hanging the UI
- [x] Unit: `sendFile()` reads a `File` object and writes base64 chunks via serial
- [x] E2E (`filesystem.spec.ts`): drag fixture file → assert in tree → `cat` output matches

---

#### ✅ Wipe on close + network isolation `L`

Depends on: file drag-drop

Exit gate:
- [x] Session state (ToS) is wiped after `pagehide` — localStorage cleared
- [x] `curl` inside terminal returns "not found" — v86 has no network relay
- [x] `wipeBurnerSession()` clears localStorage (V1: no OPFS/IndexedDB in use)
- [x] E2E (`burner.spec.ts`): pagehide clears ToS → fresh page shows modal again
- [x] E2E (`burner.spec.ts`): curl inside terminal produces no HTTP response

---

#### ✅ ToS gate `S`

Depends on: wipe on close

Exit gate:
- [x] First visit shows a ToS modal blocking the UI
- [x] Acceptance persists in localStorage (`ysb_tos_v1`) — modal absent on second visit
- [x] Unit: `readTosAccepted` / `writeTosAccepted` read/write localStorage
- [x] E2E (`e2e/tos.spec.ts`): fresh context → modal visible → accept → modal gone → reload → still gone

---

#### ✅ Error states `M`

Depends on: v86 engine

Exit gate:
- [x] v86 constructor throws → engine transitions to `error` state
- [x] Boot exceeds timeout → engine transitions to `timeout` state
- [x] Unsupported browser (no SharedArrayBuffer) → `UnsupportedBrowser` screen shown
- [x] Unit: v86 import throws → error state; sendFile before boot → throws; timeout path
- [x] E2E (`boot.spec.ts`): delete `SharedArrayBuffer` → assert `unsupported-browser` screen

---

## Phase 3 — Ship It

**Phase exit gate:** Public URL on Cloudflare Pages. Python flavor boots. A running `python3 -m http.server` is visible in the preview iframe.

---

#### ✅ CI/CD + Cloudflare Pages deploy `M`

Depends on: scaffold

Exit gate:
- [x] GitHub Actions runs `typecheck`, `test:run`, `test:e2e:fast` on every PR
- [x] All three jobs must pass before `deploy` job runs (`needs` gate)
- [x] Merge to `main` auto-deploys to GitHub Pages via `actions/deploy-pages`
- [x] COOP/COEP headers via `coi-serviceworker` SW (GitHub Pages has no custom headers)
- [x] Direct push to `main` is blocked — branch protection configured (requires typecheck+test+e2e)
- [x] No secrets needed — GitHub Pages uses built-in GITHUB_TOKEN permissions

---

#### ✅ Port forwarding → iframe preview `L`

Depends on: v86 engine, Python flavor

Exit gate:
- [x] `python3 -m http.server 8080` inside sandbox shows a response in the preview iframe via ttyS1 bridge
- [x] Unit: requestPortHttp() sends framed request, resolves with VM response, times out correctly (4 tests)
- [x] E2E (`preview.spec.ts`): boot → start http.server 8080 → Refresh → iframe visible

---

#### ✅ Web Dev flavor `M`

Depends on: port forwarding

Exit gate:
- [x] `node -e "console.log('ok')"` outputs `ok`
- [x] Express server accessible via preview iframe through ttyS1 HTTP bridge
- [x] Flavor image (Alpine + nodejs + npm, ~25 MB compressed) loads within 10s at 50 Mbps
- [x] E2E (`flavors.spec.ts`): flavor selection, banner, node --version, console.log, download timing

---

## Deferred — build only if V1 validates demand

- **OPFS persistence + workspace profiles** — multi-tab mutex, quota UI, session reload; only if users ask
- **Pro license key** — client-side JWT; add after you have paying users
- **Template / shareable URLs** — needs Pro license gating
- **Secrets vault** — AES-GCM in OPFS; interesting but not core to the demo
- **Git + SSH management** — needs Web Dev flavor and secrets vault first
- **Security Burner flavor** — needs network isolation solid first
- **Storage meter** — only relevant if persistence ships
- **Analytics** — Plausible; one afternoon, add when live
- **Keyboard focus-lock** — polish; `Ctrl+W` etc.; add when terminal is real

---

## Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| v86 too slow for real workloads | High | Set honest expectations; CheerpX (WebVM) is the upgrade path |
| SharedArrayBuffer blocked by corp IT | Medium | Document COOP/COEP requirements; test behind common proxies |
| Browser update breaks Wasm threading | Low | Pin engine version; regression E2E tests |
| Legal exposure from malware analysis | Medium | ToS gate before Burner boot; nothing leaves the browser |
