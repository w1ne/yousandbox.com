import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Copies coi-serviceworker.min.js into public/ so the browser can register it.
// Required for SharedArrayBuffer on GitHub Pages (no custom response headers).
function coiPlugin() {
    return {
        name: 'coi-serviceworker',
        buildStart() {
            copyFileSync(
                resolve('node_modules/coi-serviceworker/coi-serviceworker.min.js'),
                resolve('public/coi-serviceworker.js'),
            )
        },
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    // GitHub Pages serves the repo at /<repo-name>/ when an account-level custom domain is set.
    // Change to '/' if a dedicated custom domain is added to this repo.
    base: '/',
    plugins: [react(), coiPlugin()],
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless',
        },
    },
    preview: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'credentialless',
        },
    },
})
