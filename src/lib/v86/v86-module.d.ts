// Ambient module declaration for the 'v86' npm package.
// The package ships a built .mjs without bundled .d.ts, so we declare it here.
// A top-level import would turn this into a module augmentation — avoid it.
declare module 'v86' {
    interface V86Config {
        wasm_path?: string
        memory_size?: number
        vga_memory_size?: number
        bios?: { url: string }
        vga_bios?: { url: string }
        cdrom?: { url: string; async?: boolean; size?: number }
        hda?: { url: string; async?: boolean; size?: number }
        bzimage?: { url: string }
        initrd?: { url: string }
        autostart?: boolean
        // xterm integration — typed loosely to avoid coupling to @xterm/xterm here
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        serial_container_xtermjs?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        xterm_lib?: any
        network_relay_url?: string
        [key: string]: unknown
    }

    export class V86 {
        constructor(config: V86Config)
        run(): void
        stop(): Promise<void>
        restart(): void
        serial0_send(data: string): void
        add_listener(event: string, handler: (...args: unknown[]) => void): void
        remove_listener(event: string, handler: (...args: unknown[]) => void): void
        destroy(): Promise<void>
    }

    export default V86
}
