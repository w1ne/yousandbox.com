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
type Serial1Handler = (response: string) => void

export class V86Engine {
    private _state: BootState = 'idle'
    private emulator: V86Instance | null = null
    private stateListeners: StateListener[] = []
    private bootTimer: ReturnType<typeof setTimeout> | null = null
    private serial1Buf: string = ''
    private serial1Handlers: Set<Serial1Handler> = new Set()

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
                uart1_enabled: true,
                ...diskConfig,
            }

            this.emulator = new V86(config) as unknown as V86Instance

            // Bridge serial0 output to the xterm terminal.
            this.emulator.add_listener('serial0-output-byte', (byte: unknown) => {
                opts.terminal.write(Uint8Array.of(byte as number))
            })

            // Buffer serial1 output for HTTP bridge responses.
            this.emulator.add_listener('serial1-output-byte', (byte: unknown) => {
                this.serial1Buf += String.fromCharCode(byte as number)
                this.flushSerial1()
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

    /**
     * Forward an HTTP request to a port running inside the sandbox via the ttyS1 bridge.
     * The VM must be running the http-bridge script on /dev/ttyS1.
     * Protocol: send \x02PORT:HTTP_REQUEST\x03, receive \x02HTTP_RESPONSE\x03.
     */
    async requestPortHttp(port: number, path: string = '/'): Promise<string> {
        if (!this.emulator) throw new Error('Emulator not running')

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.serial1Handlers.delete(handler)
                reject(new Error('HTTP bridge timeout'))
            }, 10_000)

            const handler: Serial1Handler = (response) => {
                clearTimeout(timer)
                this.serial1Handlers.delete(handler)
                resolve(response)
            }

            this.serial1Handlers.add(handler)

            const req = `GET ${path} HTTP/1.0\r\nHost: localhost:${port}\r\n\r\n`
            this.emulator!.serial1_send(`\x02${port}:${req}\x03`)
        })
    }

    async sendFile(file: File, path: string): Promise<void> {
        if (!this.emulator) throw new Error('Emulator not running')

        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(reader.error)
            reader.onload = async () => {
                try {
                    const arrayBuffer = reader.result as ArrayBuffer
                    // Convert buffer to base64
                    const base64Str = btoa(
                        new Uint8Array(arrayBuffer).reduce(
                            (data, byte) => data + String.fromCharCode(byte),
                            '',
                        ),
                    )

                    // Disable echo so we don't spam the terminal, then start base64 decode
                    this.sendInput('stty -echo && base64 -d > ' + path + '\n')

                    // Allow the shell to process the command before sending data
                    await new Promise((r) => setTimeout(r, 100))

                    // Stream the base64 string in chunks to avoid blocking the UI too long
                    const CHUNK_SIZE = 1024 * 1024 // 1MB chunks
                    for (let i = 0; i < base64Str.length; i += CHUNK_SIZE) {
                        this.sendInput(base64Str.slice(i, i + CHUNK_SIZE))
                        // Yield to the event loop so the browser / engine can process
                        await new Promise((r) => setTimeout(r, 10))
                    }

                    // Send Ctrl+D (EOT) to close the stdin of base64
                    this.sendInput('\x04')

                    // Wait for base64 to process the EOT and exit, then restore echo
                    await new Promise((r) => setTimeout(r, 100))
                    this.sendInput('\nstty echo\n')

                    resolve()
                } catch (e) {
                    reject(e)
                }
            }
            reader.readAsArrayBuffer(file)
        })
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
        this.serial1Buf = ''
        this.serial1Handlers.clear()
        this.setState('idle')
    }

    private flushSerial1(): void {
        // Extract complete frames delimited by \x02...\x03
        while (true) {
            const start = this.serial1Buf.indexOf('\x02')
            if (start === -1) break
            const end = this.serial1Buf.indexOf('\x03', start + 1)
            if (end === -1) break

            const frame = this.serial1Buf.slice(start + 1, end)
            this.serial1Buf = this.serial1Buf.slice(end + 1)

            for (const handler of this.serial1Handlers) {
                handler(frame)
            }
        }
    }

    private setState(next: BootState): void {
        this._state = next
        for (const l of this.stateListeners) l(next)
    }
}
