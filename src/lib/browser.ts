/** Returns true if the browser supports SharedArrayBuffer (required for v86 Wasm threading). */
export function isSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined'
}
