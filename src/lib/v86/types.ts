import type { Terminal as XTerm } from '@xterm/xterm'

export interface V86Config {
    wasm_path: string
    memory_size: number
    vga_memory_size: number
    bios: { url: string }
    vga_bios: { url: string }
    /** Bootable CD-ROM image */
    cdrom?: { url: string; async?: boolean; size?: number }
    /** Hard-disk image */
    hda?: { url: string; async?: boolean; size?: number }
    /** Kernel bzImage */
    bzimage?: { url: string }
    /** initrd image (used with bzimage) */
    initrd?: { url: string }
    autostart?: boolean
    /** Attach an xterm.js Terminal for serial I/O */
    serial_container_xtermjs?: XTerm
    /** The xterm.js Terminal constructor (defaults to window.Terminal) */
    xterm_lib?: typeof XTerm
    /** Disable network by default */
    network_relay_url?: string
}

export interface V86Instance {
    run(): void
    stop(): Promise<void>
    restart(): void
    serial0_send(data: string): void
    add_listener(event: string, handler: (...args: unknown[]) => void): void
    remove_listener(event: string, handler: (...args: unknown[]) => void): void
    set_serial_container_xtermjs(terminal: XTerm, xtermClass?: typeof XTerm): void
    destroy(): Promise<void>
}
