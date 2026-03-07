/**
 * Downloads v86 supporting assets into public/v86/.
 * The v86 JS/wasm itself comes from the npm package.
 * Run once: node scripts/download-v86.mjs
 *
 * Custom kernel + initramfs images are fetched from the GitHub Release tagged
 * IMAGE_RELEASE_TAG. Build them locally with:
 *   bash scripts/build-python-image.sh
 *   bash scripts/build-webdev-image.sh
 * then upload vmlinuz-python / initramfs-python / initramfs-webdev as assets
 * to that release. The script skips missing assets so fast E2E still works.
 */
import { createWriteStream, mkdirSync, copyFileSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '../../')
const OUT = join(ROOT, 'public/v86')
const NM = join(ROOT, 'node_modules/v86/build')

// v86 git commit embedded in npm version string (0.5.319+g<commit>)
const V86_COMMIT = '62fd36e'
const RAW = `https://raw.githubusercontent.com/copy/v86/${V86_COMMIT}`

// GitHub Release tag where the custom kernel + initramfs images live.
// Create this release manually after running the build scripts; upload the
// three binary files as assets.
const REPO = 'w1ne/yousandbox.com'
const IMAGE_RELEASE_TAG = 'v0-images'
const RELEASE_BASE = `https://github.com/${REPO}/releases/download/${IMAGE_RELEASE_TAG}`

mkdirSync(OUT, { recursive: true })

// 1. Copy wasm from node_modules (already on disk after npm install)
for (const file of ['v86.wasm', 'v86-fallback.wasm']) {
    process.stdout.write(`  ${file} (copy from node_modules) … `)
    copyFileSync(join(NM, file), join(OUT, file))
    process.stdout.write('done\n')
}

// 2. Download BIOS files (not included in the npm package)
for (const filename of ['seabios.bin', 'vgabios.bin']) {
    const url = `${RAW}/bios/${filename}`
    process.stdout.write(`  ${filename} … `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    await pipeline(res.body, createWriteStream(join(OUT, filename)))
    process.stdout.write('done\n')
}

// 3. Download custom kernel + initramfs from the GitHub Release.
// Skips any file that isn't uploaded yet so the fast-E2E CI job still works.
for (const filename of ['vmlinuz-python', 'initramfs-python', 'initramfs-webdev']) {
    const url = `${RELEASE_BASE}/${filename}`
    process.stdout.write(`  ${filename} (GitHub Release) … `)
    const res = await fetch(url)   // fetch follows redirects by default
    if (res.status === 404) {
        process.stdout.write('not found — skipped (upload to release ' + IMAGE_RELEASE_TAG + ' to enable boot)\n')
        continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    await pipeline(res.body, createWriteStream(join(OUT, filename)))
    process.stdout.write('done\n')
}

console.log(`\nAll v86 assets written to public/v86/`)
