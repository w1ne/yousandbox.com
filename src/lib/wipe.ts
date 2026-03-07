/**
 * Wipe all Burner sandbox state on tab close.
 * V1 uses no OPFS/IndexedDB, so clearing localStorage is sufficient.
 * The v86 Wasm emulator lives only in memory and is discarded automatically
 * when the page unloads.
 */
export function wipeBurnerSession(): void {
    try {
        localStorage.clear()
    } catch {
        // storage unavailable — nothing to wipe
    }
}
