import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { V86Engine, type BootState } from './engine'
import type { Terminal as XTerm } from '@xterm/xterm'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEmulator = {
    run: vi.fn(),
    stop: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn(),
    serial0_send: vi.fn(),
    add_listener: vi.fn(),
    remove_listener: vi.fn(),
    set_serial_container_xtermjs: vi.fn(),
    destroy: vi.fn().mockResolvedValue(undefined),
}

vi.mock('v86', () => ({
    V86: vi.fn().mockImplementation(() => mockEmulator),
}))

function makeTerminal(): XTerm {
    return {
        constructor: class FakeTerminal {},
        write: vi.fn(),
        onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        open: vi.fn(),
        dispose: vi.fn(),
    } as unknown as XTerm
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('V86Engine', () => {
    let engine: V86Engine
    let terminal: XTerm

    beforeEach(() => {
        vi.clearAllMocks()
        // Re-apply async-capable defaults that clearAllMocks strips
        mockEmulator.destroy.mockResolvedValue(undefined)
        mockEmulator.stop.mockResolvedValue(undefined)
        // Default: add_listener is a no-op (does NOT auto-fire 'emulator-started')
        mockEmulator.add_listener.mockImplementation(() => {})
        engine = new V86Engine()
        terminal = makeTerminal()
    })

    afterEach(async () => {
        await engine.dispose()
    })

    it('starts in idle state', () => {
        expect(engine.state).toBe<BootState>('idle')
    })

    it('transitions to booting then running on boot()', async () => {
        const states: BootState[] = []
        engine.onStateChange((s) => states.push(s))

        // Simulate 'emulator-started' firing synchronously via add_listener mock
        mockEmulator.add_listener.mockImplementation((event, handler) => {
            if (event === 'emulator-started') handler()
        })

        await engine.boot({ terminal, imageUrl: '/img/linux.iso' })

        expect(states).toContain('booting')
        expect(states).toContain('running')
        expect(engine.state).toBe<BootState>('running')
    })

    it('passes correct config to V86 constructor', async () => {
        const { V86 } = await import('v86')
        const MockV86 = vi.mocked(V86)

        await engine.boot({
            terminal,
            imageUrl: 'https://example.com/linux.iso',
            baseUrl: '/v86',
            memoryMb: 128,
        })

        expect(MockV86).toHaveBeenCalledOnce()
        const cfg = MockV86.mock.calls[0][0] as Record<string, unknown>
        expect(cfg.wasm_path).toBe('/v86/v86.wasm')
        expect(cfg.bios).toEqual({ url: '/v86/seabios.bin' })
        expect(cfg.vga_bios).toEqual({ url: '/v86/vgabios.bin' })
        expect(cfg.memory_size).toBe(128 * 1024 * 1024)
        expect(cfg.cdrom).toMatchObject({ url: 'https://example.com/linux.iso' })
        expect(cfg.serial_container_xtermjs).toBe(terminal)
        expect(cfg.autostart).toBe(true)
    })

    it('sendInput() calls serial0_send on the emulator', async () => {
        await engine.boot({ terminal, imageUrl: '/img/linux.iso' })
        engine.sendInput('ls\n')
        expect(mockEmulator.serial0_send).toHaveBeenCalledWith('ls\n')
    })

    it('sendInput() is a no-op before boot()', () => {
        engine.sendInput('ls\n')
        expect(mockEmulator.serial0_send).not.toHaveBeenCalled()
    })

    it('throws if boot() is called twice without dispose()', async () => {
        await engine.boot({ terminal, imageUrl: '/img/linux.iso' })
        await expect(
            engine.boot({ terminal, imageUrl: '/img/linux.iso' }),
        ).rejects.toThrow('Engine already started')
    })

    it('dispose() destroys the emulator and resets to idle', async () => {
        await engine.boot({ terminal, imageUrl: '/img/linux.iso' })
        await engine.dispose()
        expect(mockEmulator.destroy).toHaveBeenCalledOnce()
        expect(engine.state).toBe<BootState>('idle')
    })

    it('onStateChange() returns an unsubscribe function', async () => {
        const listener = vi.fn()
        const unsub = engine.onStateChange(listener)
        unsub()
        mockEmulator.add_listener.mockImplementation((event, handler) => {
            if (event === 'emulator-started') handler()
        })
        await engine.boot({ terminal, imageUrl: '/img/linux.iso' })
        expect(listener).not.toHaveBeenCalled()
    })

    it('transitions to timeout state if emulator never starts within deadline', async () => {
        // add_listener is a no-op (set in beforeEach), so 'emulator-started' never fires.
        // The bootTimer is now set BEFORE the async import, so advanceTimersByTimeAsync
        // correctly fires it after flushing the import microtask.
        const states: BootState[] = []
        engine.onStateChange((s) => states.push(s))

        vi.useFakeTimers()
        const bootPromise = engine.boot({ terminal, imageUrl: '/img/linux.iso', timeoutMs: 100 })
        await vi.advanceTimersByTimeAsync(200)
        await bootPromise
        vi.useRealTimers()

        expect(states).toContain('timeout')
    })
})
