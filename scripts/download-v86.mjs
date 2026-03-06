/**
 * Downloads v86 supporting assets into public/v86/.
 * The v86 JS/wasm itself comes from the npm package.
 * Run once: node scripts/download-v86.mjs
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

mkdirSync(OUT, { recursive: true })

// 1. Copy wasm from node_modules (already on disk)
for (const file of ['v86.wasm', 'v86-fallback.wasm']) {
    process.stdout.write(`  ${file} (copy from node_modules) … `)
    copyFileSync(join(NM, file), join(OUT, file))
    process.stdout.write('done\n')
}

// 2. Download BIOS files (not included in the npm package)
const biosFiles = [
    [`${RAW}/bios/seabios.bin`, 'seabios.bin'],
    [`${RAW}/bios/vgabios.bin`, 'vgabios.bin'],
]

for (const [url, filename] of biosFiles) {
    const dest = join(OUT, filename)
    process.stdout.write(`  ${filename} … `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    await pipeline(res.body, createWriteStream(dest))
    process.stdout.write('done\n')
}

// 3. Download disk image — served locally to avoid CORS (copy.sh has no CORS headers)
const images = [
    ['https://copy.sh/v86/images/linux4.iso', 'linux4.iso'],
]

for (const [url, filename] of images) {
    const dest = join(OUT, filename)
    process.stdout.write(`  ${filename} (disk image, may be large) … `)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    await pipeline(res.body, createWriteStream(dest))
    process.stdout.write('done\n')
}

console.log(`\nAll v86 assets written to public/v86/`)
