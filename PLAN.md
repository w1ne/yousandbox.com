# yousandbox.com — Product & Technical Plan

---

## Current Focus

**Phase 1 — Proof of Concept** ← working here now

Jump to: [Phase 1](#phase-1--proof-of-concept) · [Phase 2](#phase-2--make-it-useful) · [Phase 3](#phase-3--make-it-a-product) · [Phase 4](#phase-4--growth)

---

## Vision

Zero-install Linux in any browser tab, running on the user's own hardware.

Our differentiator is not "no install" — Replit and CodeSandbox also have no install. Ours is:
1. **Local execution** — code runs on the user's CPU/GPU, not a remote server. No latency, no data leaving the machine.
2. **True isolation** — Burner mode is sandboxed by the browser itself. No account needed, no traces left.
3. **Works behind corporate firewalls** — just a web page, no outbound traffic required.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Kernel | WebAssembly + Pthreads | Run Linux at near-native speed |
| Storage | Origin Private File System (OPFS) | Persistent browser-local filesystem |
| GPU | WebGPU | Direct GPU access for compute/AI |
| I/O | WebSerial + WebRTC | USB device access + P2P networking |
| UI | Vite + React + TypeScript + Tailwind | App shell |
| Editor | Monaco | VS Code-familiar code editing |
| Unit tests | Vitest + @testing-library/react | Fast, Vite-native |
| E2E tests | Playwright (Chromium only, V1) | Critical path coverage |
| Hosting | Cloudflare Pages (static) | CDN for Wasm images, COOP/COEP headers |
| CI/CD | GitHub Actions | Test on PR, deploy to Cloudflare Pages on merge to main |

**No backend.** Everything runs in the browser. No server, no database, no accounts. All state lives in OPFS and localStorage.

---

## Target Users (Jobs to Be Done)

1. **Locked-down developer** — needs to run Docker/WSL/Node but IT won't allow installs. Wants a full Linux dev environment through an approved browser.
2. **Security researcher** — needs to open a suspicious file or run an unknown script without risking their real machine. Wants instant disposable isolation, no setup.
3. **Educator** — wants to send one URL that boots a pre-configured Linux environment for every student, identical every time.

---

## Competitors & Why We Win

| Product | Their angle | Our edge |
|---------|------------|----------|
| StackBlitz / WebContainers | Browser-based Node.js dev | We run full Linux, not just Node |
| GitHub Codespaces | Cloud dev environment | Local execution — no server costs, no latency, works offline |
| Replit | Collaborative online IDE | No account needed, works offline, true security isolation |
| CodeSandbox | Frontend sandboxing | We run a real OS, not just a JS sandbox |
| Local Docker/WSL | Full Linux locally | Zero install, works on locked-down machines |

---

## Two Boot Modes

**Persistent Workspace**
- Files, packages, and config survive tab close and browser restarts (OPFS)
- Requires auth so the right OPFS origin loads per user

**Burner Sandbox**
- No OPFS write, network disabled by default
- On close: IndexedDB cleared, OPFS origin deleted, service worker cache purged
- Enforced by browser storage APIs — not by us

---

## UI Layout (Desktop-only, V1)

```
┌─────────────────────────────────────────────────────┐
│  yousandbox.com    [Flavor ▼]  [Mode ▼]  [Boot]     │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│  Files   │      Code Editor         │   Preview      │
│  (tree)  │      (Monaco)            │   (iframe)     │
│          │                          │                │
├──────────┴──────────────────────────┴────────────────┤
│  Terminal                          [storage: 2.1 GB] │
│  $ _                                                 │
└─────────────────────────────────────────────────────┘
```

Mobile is a non-goal for V1. Minimum viable screen: 1280px wide.

---

## Environment Flavors

**Realistic load target: under 10s on a 50 Mbps connection.** Use CDN + streaming decompression.

| # | Name | Pre-installed | Build order |
|---|------|--------------|-------------|
| 1 | Python & Data | `python3`, `pip`, `pandas`, `numpy` | First — smallest image, no port-forwarding needed |
| 2 | Web Dev | `node`, `npm`, `git`, `curl`, `sqlite3` | After Phase 1 — needs port-forwarding |
| 3 | Security Burner | `wget`, `nmap`, `wireshark` (CLI), `tar`, `unzip`, `strings`, `file` | After Phase 3 — needs ToS gate + network isolation |

---

## Monetization

No subscriptions. No accounts. One-time license key purchased via Gumroad/LemonSqueezy.

| Tier | Price | Unlocks |
|------|-------|---------|
| Free | $0 | Core sandbox, Python flavor, 2 GB OPFS |
| Pro license | $29 one-time | All flavors, unlimited OPFS, secrets vault, custom template URLs |

**How license validation works (no backend):**
- User buys on Gumroad → receives a signed license key
- Key is a JWT signed with our private key; app verifies with the embedded public key
- Valid key stored in localStorage → Pro features unlocked client-side
- No server call required after purchase; works offline and behind firewalls

Abuse vector: crypto mining. Mitigated by CPU-minute quotas enforced client-side only (no server audit).

---

## Browser Compatibility

| Feature | Chrome/Edge | Firefox | Safari |
|---------|------------|---------|--------|
| OPFS sync access | ✅ | ✅ | ⚠️ partial |
| SharedArrayBuffer (Wasm threads) | ✅ | ✅ | ⚠️ restricted |
| WebGPU | ✅ | 🔜 | ⚠️ partial |
| WebSerial | ✅ | ❌ | ❌ |

**V1 supports Chrome/Edge only.** Show a clear unsupported-browser message for others.

---

## Wasm Engine

| Engine | License | Notes |
|--------|---------|-------|
| [v86](https://github.com/copy/v86) | MIT | Stable, slower — use for V1 |
| [WebVM / CheerpX](https://github.com/leaningtech/webvm) | Commercial | Faster, production-ready — negotiate license if V1 validates |

---

## Known Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| v86 too slow for real workloads | High | Set honest expectations; have CheerpX as upgrade path |
| OPFS quota too small for dev use cases | Medium | Show storage meter early; upsell Pro license |
| SharedArrayBuffer blocked by corp IT headers | Medium | Document COOP/COEP requirements; test behind common proxies |
| Browser update breaks Wasm threading | Low | Pin engine version; have regression E2E tests |
| Legal exposure from malware analysis use case | Medium | ToS gate before Burner boot; nothing ever leaves the browser |
| License key spoofing (client-side validation) | Medium | Acceptable for V1 — obfuscate public key; upgrade to server validation if piracy becomes significant |
| User loses Pro access if they clear localStorage | Low | Remind user to export license key; re-entry is instant |

---

## Item Status Key

```
⬜ Not started    🔄 In progress    ✅ Done    🚫 Blocked
```

Size: `S` = 1–2 days · `M` = 3–5 days · `L` = 1–2 weeks · `XL` = 2+ weeks

Exit gates are binary checklists — every box must be checked to close the item.

---

## Phase 1 — Proof of Concept

**Out of scope for this phase:** auth, persistence, Burner mode, any flavor other than Python.

**Phase exit gate:** A first-time visitor can open the page, click Boot, and run `python3 -c "print('ok')"` within 60s. Zero console errors.

---

#### ⬜ Vite + React + Tailwind scaffold `S`

Depends on: nothing

Exit gate:
- [ ] `npm run dev` serves app at localhost without errors
- [ ] `npm run build` produces a `dist/` with no TypeScript or build errors
- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:run` exits 0 (no tests yet = no failures)

---

#### ⬜ Monaco editor + 4-pane layout `M`

Depends on: scaffold

Note: preview pane shows a "Run your code to see output here" placeholder in Phase 1. Port forwarding is out of scope — the pane is present in the layout but inert until Phase 3.

Exit gate:
- [ ] Editor renders and accepts keyboard input
- [ ] Python and JavaScript files are syntax-highlighted correctly
- [ ] 4-pane layout is stable at 1280px and 1920px (no overflow, no collapse)
- [ ] Preview pane shows placeholder text (not blank, not broken)
- [ ] Unit: editor component mounts without errors
- [ ] Unit: pane resize handler updates widths correctly
- [ ] E2E (`boot.spec.ts`): page loads, editor is visible and accepts input, preview pane shows placeholder

---

#### ⬜ v86 Wasm Linux engine `L`

Depends on: scaffold

Exit gate:
- [ ] v86 binary loads without errors in Chromium
- [ ] Linux kernel boots to a shell prompt within 45s
- [ ] COOP/COEP headers are set (required for SharedArrayBuffer)
- [ ] Unit: engine wrapper exposes `boot()`, `sendInput()`, `onOutput()` with correct types (v86 mocked)
- [ ] E2E (`boot.spec.ts`): Boot button clicked → terminal contains `$` within 45s

---

#### ⬜ Python flavor image `M`

Depends on: v86 engine

Exit gate:
- [ ] Flavor image loads and mounts without errors
- [ ] `python3 --version` outputs a version string
- [ ] `python3 -c "import pandas; print('ok')"` outputs `ok`
- [ ] Image loads within 10s on a simulated 50 Mbps connection (Playwright network throttle)
- [ ] E2E (`flavors.spec.ts`): boot Python flavor → run one-liner → assert correct output within 10s of prompt

---

## Phase 2 — Make It Useful

**Out of scope for this phase:** auth, paid tiers, port forwarding, flavors 2 and 3.

**Phase exit gate:** A user drags a CSV into the sandbox, writes a Python script to process it, runs it, and the output file is still there after a page reload.

---

#### ⬜ Drag-and-drop file import `M`

Depends on: Python flavor

Exit gate:
- [ ] Dropping a file onto the file tree shows it in the tree immediately
- [ ] The file is readable inside the terminal at the same path (`cat filename` works)
- [ ] Files up to 50 MB import without hanging the UI
- [ ] Unit: file import handler reads a `File` object and writes bytes to OPFS mock correctly
- [ ] E2E (`filesystem.spec.ts`): drag fixture file onto page → assert in tree → `cat` output matches file contents

---

#### ⬜ File download from sandbox `S`

Depends on: drag-and-drop file import

Exit gate:
- [ ] Right-clicking a file in the file tree offers a "Download" option
- [ ] Clicking Download triggers a browser file-save for the correct file contents
- [ ] Works for binary files (images, zips), not just text
- [ ] Unit: file export handler reads bytes from OPFS mock and produces a correct `Blob`
- [ ] E2E (`filesystem.spec.ts`): create file in sandbox → right-click → download → assert downloaded file contents match

---

#### ⬜ OPFS persistence (Persistent Workspace) `L`

Depends on: drag-and-drop file import

Exit gate:
- [ ] File created inside sandbox survives `page.reload()`
- [ ] File created in session A is not visible in a fresh browser context (origin isolation)
- [ ] Unit: OPFS abstraction layer read/write/delete/list against mocked `navigator.storage`
- [ ] E2E (`filesystem.spec.ts`): create file → reload → file present in tree and readable in terminal

---

#### ⬜ Burner mode (wipe on close, network off) `L`

Depends on: OPFS persistence

Exit gate:
- [ ] File created in Burner mode is gone after tab close — OPFS, IndexedDB, and SW cache all empty (verified by querying each directly)
- [ ] `curl https://example.com` inside Burner terminal returns a network error, not a response
- [ ] Switching from Persistent to Burner mode does not expose Persistent Workspace files
- [ ] Unit: `wipeBurnerSession()` calls `clearIndexedDB`, `deleteOPFSOrigin`, `clearSWCache` in that exact order (all mocked)
- [ ] E2E (`burner.spec.ts`): create file in Burner → close tab → new context → assert OPFS/IDB/SW are empty
- [ ] E2E (`burner.spec.ts`): network request from inside Burner terminal is blocked

---

#### ⬜ Storage meter `S`

Depends on: OPFS persistence

Exit gate:
- [ ] Meter shows current used bytes and total quota
- [ ] Value updates within 2s of a file write
- [ ] Warning state (amber) appears at 80% usage
- [ ] Error state (red) appears at 95% usage
- [ ] Unit: byte formatter covers B/KB/MB/GB ranges correctly
- [ ] Unit: threshold logic returns correct state for values at 0%, 79%, 80%, 95%, 100%
- [ ] E2E: write a file large enough to move the meter → assert displayed value increases

---

#### ⬜ Multi-tab safety `M`

Depends on: OPFS persistence

Exit gate:
- [ ] Opening a second tab with the same Persistent Workspace shows a "already open in another tab" warning and does not boot a second sandbox instance
- [ ] The warning offers two options: switch to the existing tab, or open in read-only mode
- [ ] Two simultaneous Burner sessions are allowed (they are fully isolated)
- [ ] Unit: tab-lock acquire/release using `BroadcastChannel` or `localStorage` mutex (mocked)
- [ ] E2E (`filesystem.spec.ts`): open same workspace in two tabs → assert second tab shows warning, not a running sandbox

---

#### ⬜ Keyboard focus-lock `S`

Depends on: Monaco + terminal layout

Exit gate:
- [ ] `Ctrl+W` does not close the tab when terminal is focused
- [ ] `F5` does not reload the page when terminal is focused
- [ ] `Ctrl+T` does not open a new tab when terminal is focused
- [ ] Focus-lock disengages when user clicks outside the terminal
- [ ] E2E (`keyboard.spec.ts`): focus terminal → dispatch each key combo → assert page is still open and unmodified

---

#### ⬜ Error states `M`

Depends on: v86 engine, OPFS persistence, storage meter

Exit gate:
- [ ] v86 fails to load → user sees "Failed to start sandbox" with a retry button, not a blank screen
- [ ] Boot exceeds 45s timeout → user sees "Boot timed out" with a retry button
- [ ] OPFS quota exceeded mid-session → non-dismissable banner with link to free space or upgrade
- [ ] Unsupported browser detected on page load → full-screen message shown before any boot attempt
- [ ] Unit: each failure condition maps to the correct error state enum value
- [ ] E2E: mock each failure scenario → assert correct message and action button appears

---

## Phase 3 — Make It a Product

**Out of scope for this phase:** paid billing, template publishing, flavors 2 and 3, collaboration, any server.

**Phase exit gate:** A user creates a named local workspace, boots it, starts a local web server, sees it in the preview pane, exports their state, and restores it in a fresh browser session.

---

#### ⬜ CI/CD + deployment `M`

Depends on: scaffold

Exit gate:
- [ ] GitHub Actions workflow runs `typecheck`, `test:run`, and `test:e2e` (Playwright, Chromium) on every PR
- [ ] Merge to `main` triggers automatic deploy to Cloudflare Pages via GitHub Actions
- [ ] A failed check blocks merge — branch protection rules enforce this
- [ ] COOP/COEP headers are set via `public/_headers` and verified in the E2E run
- [ ] Cloudflare Pages deploy token is stored as a GitHub Actions secret, never committed
- [ ] E2E: GitHub Actions run completes green on a clean checkout of `main`

---

#### ⬜ Analytics setup `S`

Depends on: scaffold

Exit gate:
- [ ] Plausible (privacy-first, no cookies, no PII) is installed and sending page views
- [ ] The following events are tracked: `sandbox_booted`, `sandbox_wiped`, `file_imported`, `file_downloaded`, `flavor_selected`
- [ ] Analytics are disabled when `Do Not Track` is set
- [ ] No user identifiers or IP addresses are stored
- [ ] Unit: event tracking calls fire with correct payload shape (Plausible client mocked)
- [ ] E2E: boot sandbox → assert `sandbox_booted` event was dispatched (intercept via `page.route()`)

---

#### ⬜ Local workspace profiles `M`

Depends on: OPFS persistence

Note: replaces server-side auth. Identity is local to the browser — no accounts, no login, no server.

Exit gate:
- [ ] User can create a named workspace (e.g. "work", "personal") stored as a separate OPFS directory
- [ ] Workspace switcher in the top bar shows all saved profiles and allows switching
- [ ] Switching workspaces reboots the sandbox with the correct OPFS directory mounted
- [ ] Deleting a workspace wipes its OPFS directory and removes it from the list
- [ ] Unit: workspace registry read/write/delete from localStorage, OPFS directory isolation
- [ ] E2E: create two workspaces → write different files to each → switch → assert correct files are visible in each

---

#### ⬜ Port forwarding → iframe preview `L`

Depends on: v86 engine, Python flavor

Exit gate:
- [ ] `python3 -m http.server 8080` inside sandbox makes a response appear in the preview iframe within 5s
- [ ] Navigating to a different port in the sandbox updates the preview URL
- [ ] Unit: port mapping logic correctly derives host-visible URL from sandbox port number
- [ ] E2E (`preview.spec.ts`): start HTTP server in sandbox → assert iframe `src` resolves and iframe body contains expected content

---

#### ⬜ CPU quota enforcement `M`

Depends on: auth

Exit gate:
- [ ] Free-tier process exceeding the quota limit is killed
- [ ] User sees a quota-exceeded message with an upgrade prompt
- [ ] Pro-tier user is not affected by free-tier limits
- [ ] Unit: quota counter increment, threshold detection, kill-signal dispatch (all mocked)
- [ ] E2E: mock quota clock to exceed limit → assert process terminated → assert correct UI message shown

---

#### ⬜ ToS gate for Burner `S`

Depends on: Burner mode

Exit gate:
- [ ] First Burner boot in a fresh context shows a ToS modal
- [ ] Boot button is disabled until ToS is accepted
- [ ] Acceptance persists in localStorage — modal does not reappear on subsequent boots
- [ ] Unit: acceptance state read/write/clear from localStorage
- [ ] E2E: fresh browser context → click Burner boot → assert modal → accept → assert modal absent on next boot

---

#### ⬜ Export/Import sandbox state `M`

Depends on: OPFS persistence, local workspace profiles

Exit gate:
- [ ] Export downloads a `.zip` containing all files from the current OPFS workspace
- [ ] Importing that `.zip` into a fresh session restores all files exactly (name, content, path)
- [ ] Import of a corrupt or non-sandbox zip shows a clear error, does not crash
- [ ] Unit: zip serialization and deserialization of a mocked OPFS file tree
- [ ] E2E: create 3 files → export → wipe OPFS → import zip → assert all 3 files present with correct contents

---

## Phase 4 — Growth

**Out of scope for this phase:** mobile, Firefox/Safari support, WebGPU features.

**Phase exit gate:** Pro license unlocks correctly. Template URLs load a pre-configured environment. All three flavors pass smoke tests.

---

#### ⬜ Pro license key `M`

Depends on: storage meter, CPU quotas

Exit gate:
- [ ] User can enter a license key in Settings; invalid key shows a clear error
- [ ] Valid key (JWT verified against embedded public key) persists in localStorage and unlocks Pro features
- [ ] Pro: OPFS limit raised, all flavors accessible, secrets vault unlocked, template publishing unlocked
- [ ] Free user hitting storage limit sees an upgrade prompt pointing to the Gumroad purchase page
- [ ] Clearing the license key reverts to Free tier immediately
- [ ] Unit: JWT signature verification with a test keypair, tier feature-flag logic
- [ ] E2E: enter valid test license key → assert Pro features are unlocked → clear key → assert features are locked

---

#### ⬜ Template system + shareable URLs `L`

Depends on: Export/Import, Pro license key

Note: no backend. Templates are static JSON bundles — exported from the sandbox and hosted as a static file (e.g. a GitHub Gist or any public URL). `yousandbox.com/?template=<url>` fetches and boots it.

Exit gate:
- [ ] "Export as template" produces a `.json` file describing the flavor, pre-loaded files, and startup command
- [ ] `yousandbox.com/?template=<url>` fetches the JSON, validates it, and boots the environment
- [ ] Booting a template does not modify the template file — changes go to a fresh local workspace
- [ ] An invalid or unreachable template URL shows a clear error before attempting boot
- [ ] Unit: template JSON schema validation, startup command injection
- [ ] E2E: export template → serve as fixture → load via `?template=` URL → assert environment matches → mutate → assert fixture file unchanged

---

#### ⬜ Secrets vault `M`

Depends on: local workspace profiles, Pro license key

Note: no backend. Secrets are encrypted in OPFS using AES-GCM with a key derived from a user-set passphrase (PBKDF2). Nothing leaves the browser.

Exit gate:
- [ ] User sets a vault passphrase on first use; passphrase is never stored — only the derived key (in memory for the session)
- [ ] User can add/delete named secrets; values are stored encrypted in OPFS
- [ ] Secrets are injected as env vars into the sandbox at boot — not written to plaintext OPFS
- [ ] Secrets are masked (`***`) in terminal output
- [ ] Secrets are scoped to Persistent Workspace only — Burner mode cannot access them
- [ ] Closing the tab clears the in-memory key; re-opening requires passphrase re-entry
- [ ] Unit: PBKDF2 key derivation, AES-GCM encrypt/decrypt round-trip, masking logic
- [ ] E2E: set passphrase → store secret → boot sandbox → run `echo $SECRET` → assert masked

---

#### ⬜ Git + SSH key management `L`

Depends on: Web Dev flavor, secrets vault

Exit gate:
- [ ] `git clone` a public repo inside the sandbox successfully
- [ ] User can commit a change and push using a stored SSH key
- [ ] SSH key is stored encrypted; it never appears in terminal output
- [ ] Unit: SSH key encryption/decryption, key injection into sandbox environment
- [ ] E2E: clone test repo → edit file → commit → assert `git log` shows commit with correct message

---

#### ⬜ Web Dev flavor `M`

Depends on: v86 engine, port forwarding

Exit gate:
- [ ] `node -e "console.log('ok')"` outputs `ok`
- [ ] `npm install` in a project directory completes without error
- [ ] A running Express server is accessible in the preview iframe
- [ ] Flavor image loads within 10s on a simulated 50 Mbps connection
- [ ] E2E (`flavors.spec.ts`): smoke commands pass within timeout

---

#### ⬜ Security Burner flavor `M`

Depends on: Burner mode, ToS gate, network isolation

Exit gate:
- [ ] `nmap --version` outputs a version string
- [ ] Network is unreachable by default (`curl` fails)
- [ ] ToS gate fires on first boot
- [ ] Wipe-on-close works identically to the base Burner mode
- [ ] E2E (`flavors.spec.ts`): smoke commands pass
- [ ] E2E (`burner.spec.ts`): wipe and network isolation assertions pass with this flavor

---

## Key Metrics

| Metric | Tool | Target |
|--------|------|--------|
| Time-to-first-command | Playwright trace | < 60s |
| Flavor image load time | Playwright network log | < 10s on 50 Mbps |
| Session length | Analytics | > 10 min median |
| Bounce rate at boot screen | Analytics | < 40% |
| Free → Pro conversion | Stripe | > 3% |
| OPFS storage per free user | Server audit | < 1.5 GB avg |
