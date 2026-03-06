import type { Terminal as XTerm } from '@xterm/xterm'
import type { V86Instance } from './types'

export type BootState = 'idle' | 'booting' | 'running' | 'error' | 'timeout'

export interface BootOptions {
    /** xterm.js Terminal instance for serial I/O */
    terminal: XTerm
    /** URL of the disk/CD image (cdrom when no kernelUrl; hda when kernelUrl present; omit for initramfs-only boot) */
    imageUrl?: string
    /**
     * URL of a bzImage kernel. When provided, boots via bzimage+hda instead of cdrom.
     * Use for flavors that ship a separate kernel (e.g. Python/Alpine).
     */
    kernelUrl?: string
    /** URL of an initrd/initramfs image (required when kernelUrl is set and kernel has ext4 as a module) */
    initrdUrl?: string
    /** Kernel cmdline (only used when kernelUrl is set; default: "root=/dev/sda rw console=ttyS0 quiet") */
    cmdline?: string
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

            // Guard: timeout may have fired while v86 was loading.
            // Use the public getter to bypass TS's overly-narrow control flow analysis.
            if (this.state !== 'booting') return

            const diskConfig = opts.kernelUrl
                ? {
                      bzimage: { url: opts.kernelUrl },
                      ...(opts.initrdUrl ? { initrd: { url: opts.initrdUrl } } : {}),
                      ...(opts.imageUrl ? { hda: { url: opts.imageUrl, async: true } } : {}),
                      cmdline: opts.cmdline ?? 'root=/dev/sda rw console=ttyS0 quiet',
                  }
                : { cdrom: { url: opts.imageUrl as string, async: true } }

            const config = {
                wasm_path: `${base}/v86.wasm`,
                memory_size: memBytes,
                vga_memory_size: 8 * 1024 * 1024,
                bios: { url: `${base}/seabios.bin` },
                vga_bios: { url: `${base}/vgabios.bin` },
                autostart: true,
                ...diskConfig,
            }

            this.emulator = new V86(config) as unknown as V86Instance

            // Bridge serial output to our xterm terminal directly.
            // v86's serial_container_xtermjs creates a new terminal internally
            // (it expects an HTMLElement, not our existing Terminal instance).
            this.emulator.add_listener('serial0-output-byte', (byte: unknown) => {
                opts.terminal.write(Uint8Array.of(byte as number))
            })

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
