import type { Terminal as XTerm } from '@xterm/xterm'
import type { V86Instance } from './types'

export type BootState = 'idle' | 'booting' | 'running' | 'error' | 'timeout'

export interface BootOptions {
    /** xterm.js Terminal instance for serial I/O */
    terminal: XTerm
    /** URL of the disk/CD image to boot */
    imageUrl: string
    /** Base URL for v86 wasm + BIOS assets (default: /v86) */
    baseUrl?: string
    /** RAM in MiB (default: 256) */
    memoryMb?: number
    /** Boot timeout in ms (default: 45 000) */
    timeoutMs?: number
}

type StateListener = (state: BootState) => void

export class V86Engine {
    private _state: BootState = 'idle'
    private emulator: V86Instance | null = null
    private stateListeners: StateListener[] = []
    private bootTimer: ReturnType<typeof setTimeout> | null = null

    get state(): BootState {
        return this._state
    }

    onStateChange(listener: StateListener): () => void {
        this.stateListeners.push(listener)
        return () => {
            this.stateListeners = this.stateListeners.filter((l) => l !== listener)
        }
    }

    async boot(opts: BootOptions): Promise<void> {
        if (this._state !== 'idle') throw new Error('Engine already started')
        this.setState('booting')

        const base = opts.baseUrl ?? '/v86'
        const memBytes = (opts.memoryMb ?? 256) * 1024 * 1024
        const timeout = opts.timeoutMs ?? 45_000

        // Start the timeout clock before the async import so 45 s begins immediately.
        this.bootTimer = setTimeout(() => {
            if (this._state === 'booting') {
                this.setState('timeout')
                void this.dispose()
            }
        }, timeout)

        try {
            const { V86 } = await import('v86')
            const Terminal = opts.terminal.constructor as typeof XTerm

            // Guard: timeout may have fired while v86 was loading.
            // Use the public getter to bypass TS's overly-narrow control flow analysis.
            if (this.state !== 'booting') return

            const config = {
                wasm_path: `${base}/v86.wasm`,
                memory_size: memBytes,
                vga_memory_size: 8 * 1024 * 1024,
                bios: { url: `${base}/seabios.bin` },
                vga_bios: { url: `${base}/vgabios.bin` },
                cdrom: { url: opts.imageUrl, async: true },
                autostart: true,
                serial_container_xtermjs: opts.terminal,
                xterm_lib: Terminal,
            }

            this.emulator = new V86(config) as unknown as V86Instance

            this.emulator.add_listener('emulator-started', () => {
                if (this._state === 'booting') {
                    if (this.bootTimer) clearTimeout(this.bootTimer)
                    this.setState('running')
                }
            })
        } catch (err) {
            if (this.bootTimer) {
                clearTimeout(this.bootTimer)
                this.bootTimer = null
            }
            this.setState('error')
            throw err
        }
    }

    sendInput(data: string): void {
        this.emulator?.serial0_send(data)
    }

    async dispose(): Promise<void> {
        if (this.bootTimer) {
            clearTimeout(this.bootTimer)
            this.bootTimer = null
        }
        if (this.emulator) {
            await this.emulator.destroy()
            this.emulator = null
        }
        this.setState('idle')
    }

    private setState(next: BootState): void {
        this._state = next
        for (const l of this.stateListeners) l(next)
    }
}
