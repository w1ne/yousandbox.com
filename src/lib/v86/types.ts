export interface V86Config {
    wasm_path: string
    memory_size: number
    vga_memory_size: number
    bios: { url: string }
    vga_bios: { url: string }
    cdrom?: { url: string; async?: boolean; size?: number }
    hda?: { url: string; async?: boolean; size?: number }
    bzimage?: { url: string }
    initrd?: { url: string }
    autostart?: boolean
    network_relay_url?: string
}

export interface V86Instance {
    run(): void
    stop(): Promise<void>
    restart(): void
    serial0_send(data: string): void
    add_listener(event: string, handler: (...args: unknown[]) => void): void
    remove_listener(event: string, handler: (...args: unknown[]) => void): void
    destroy(): Promise<void>
}
