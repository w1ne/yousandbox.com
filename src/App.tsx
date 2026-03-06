import { useState, useRef, useCallback, useEffect } from 'react'
import type { Terminal as XTerm } from '@xterm/xterm'
import FileTree from './components/layout/FileTree'
import CodeEditor from './components/layout/CodeEditor'
import Preview from './components/layout/Preview'
import Terminal from './components/layout/Terminal'
import { adjustLeftHandle, adjustRightHandle, PaneWidths } from './lib/layout/paneResize'
import { V86Engine, type BootState } from './lib/v86/engine'

// ---- layout constants -------------------------------------------------------
const INITIAL_COL_WIDTHS: PaneWidths = { left: 15, center: 52, right: 33 }
const INITIAL_TERM_HEIGHT = 30 // % of total height
const MIN_TERM_HEIGHT = 15
const MAX_TERM_HEIGHT = 60

// ---- flavor configs ---------------------------------------------------------
const FLAVORS = {
    python: {
        label: 'Python & Data',
        imageUrl: undefined,
        kernelUrl: '/v86/vmlinuz-python',
        initrdUrl: '/v86/initramfs-python',
        cmdline: 'console=ttyS0 noapic nolapic earlyprintk=serial,ttyS0',
        memoryMb: 1024,
    },
    linux: {
        label: 'Linux (basic)',
        imageUrl: '/v86/linux4.iso',
        kernelUrl: undefined,
        memoryMb: undefined,
    },
} as const

type FlavorId = keyof typeof FLAVORS

interface DragState {
    type: 'left' | 'right' | 'terminal'
    startX: number
    startY: number
    startWidths: PaneWidths
    startTermHeight: number
}

const BOOT_LABEL: Record<BootState, string> = {
    idle: 'Boot',
    booting: 'Booting…',
    running: 'Running',
    error: 'Retry',
    timeout: 'Retry',
}

export default function App() {
    // pane layout
    const [colWidths, setColWidths] = useState<PaneWidths>(INITIAL_COL_WIDTHS)
    const [termHeight, setTermHeight] = useState(INITIAL_TERM_HEIGHT)
    const containerRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)

    // v86
    const [bootState, setBootState] = useState<BootState>('idle')
    const [flavor, setFlavor] = useState<FlavorId>('python')
    const engineRef = useRef<V86Engine | null>(null)
    const terminalRef = useRef<XTerm | null>(null)

    // ---- drag-resize --------------------------------------------------------
    const onMouseDown = useCallback(
        (type: DragState['type']) =>
            (e: React.MouseEvent) => {
                e.preventDefault()
                dragRef.current = {
                    type,
                    startX: e.clientX,
                    startY: e.clientY,
                    startWidths: colWidths,
                    startTermHeight: termHeight,
                }
            },
        [colWidths, termHeight],
    )

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            const drag = dragRef.current
            if (!drag || !containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()

            if (drag.type === 'terminal') {
                const deltaY = e.clientY - drag.startY
                const deltaPct = -(deltaY / rect.height) * 100
                const newHeight = Math.max(
                    MIN_TERM_HEIGHT,
                    Math.min(MAX_TERM_HEIGHT, drag.startTermHeight + deltaPct),
                )
                setTermHeight(newHeight)
            } else {
                const deltaPct = ((e.clientX - drag.startX) / rect.width) * 100
                if (drag.type === 'left') {
                    setColWidths(adjustLeftHandle(drag.startWidths, deltaPct))
                } else {
                    setColWidths(adjustRightHandle(drag.startWidths, deltaPct))
                }
            }
        }

        const onMouseUp = () => {
            dragRef.current = null
        }

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
        return () => {
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
        }
    }, [])

    // ---- boot ---------------------------------------------------------------
    const handleBoot = useCallback(async () => {
        if (bootState === 'booting' || bootState === 'running') return

        // Dispose previous engine on retry
        if (engineRef.current) {
            await engineRef.current.dispose()
            engineRef.current = null
        }

        if (!terminalRef.current) return

        const engine = new V86Engine()
        engineRef.current = engine
        engine.onStateChange(setBootState)

        try {
            const { imageUrl, kernelUrl, initrdUrl, cmdline, memoryMb } = FLAVORS[flavor] as {
                imageUrl: string | undefined
                kernelUrl: string | undefined
                initrdUrl?: string
                cmdline?: string
                memoryMb?: number
            }
            await engine.boot({
                terminal: terminalRef.current,
                imageUrl,
                kernelUrl,
                initrdUrl,
                cmdline,
                memoryMb,
            })
        } catch {
            // state already set to 'error' by engine
        }
    }, [bootState])

    const handleTerminalData = useCallback((data: string) => {
        engineRef.current?.sendInput(data)
    }, [])

    const handleTerminalReady = useCallback((terminal: XTerm) => {
        terminalRef.current = terminal
    }, [])

    // ---- boot state indicator -----------------------------------------------
    const isBooting = bootState === 'booting'
    const isError = bootState === 'error' || bootState === 'timeout'
    const bootDisabled = isBooting || bootState === 'running'

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-screen bg-[#0d1117] text-[#e6edf3] select-none overflow-hidden"
        >
            {/* Top bar */}
            <header className="flex items-center gap-3 px-4 py-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
                <span className="font-bold tracking-tight text-sm">yousandbox</span>
                <select
                    className="ml-4 bg-[#21262d] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] cursor-pointer"
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value as FlavorId)}
                    disabled={bootState !== 'idle'}
                    aria-label="Flavor"
                >
                    {(Object.entries(FLAVORS) as [FlavorId, (typeof FLAVORS)[FlavorId]][]).map(
                        ([id, f]) => (
                            <option key={id} value={id}>{f.label}</option>
                        ),
                    )}
                </select>
                <select
                    className="bg-[#21262d] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] cursor-pointer"
                    defaultValue="burner"
                    aria-label="Mode"
                >
                    <option value="burner">Burner</option>
                </select>

                {/* Boot button */}
                <button
                    onClick={() => void handleBoot()}
                    disabled={bootDisabled}
                    aria-label="Boot sandbox"
                    data-testid="boot-button"
                    className={[
                        'ml-2 text-white text-xs px-3 py-1 rounded font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                        isError
                            ? 'bg-[#da3633] hover:bg-[#b62324]'
                            : 'bg-[#238636] hover:bg-[#2ea043] active:bg-[#26a641]',
                    ].join(' ')}
                >
                    {BOOT_LABEL[bootState]}
                </button>

                {/* Status indicator */}
                {(isBooting || isError) && (
                    <span
                        className={`text-xs ${isError ? 'text-[#f85149]' : 'text-[#8b949e] animate-pulse'}`}
                        data-testid="boot-status"
                    >
                        {bootState === 'timeout'
                            ? 'Boot timed out'
                            : bootState === 'error'
                              ? 'Failed to start sandbox'
                              : 'Starting…'}
                    </span>
                )}
            </header>

            {/* Body: columns + terminal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Three-column row */}
                <div
                    className="flex overflow-hidden"
                    style={{ height: `${100 - termHeight}%` }}
                    data-testid="columns-row"
                >
                    <div
                        className="overflow-hidden shrink-0"
                        style={{ width: `${colWidths.left}%` }}
                        data-testid="pane-files"
                    >
                        <FileTree />
                    </div>

                    <div
                        className="w-1 shrink-0 cursor-col-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors"
                        onMouseDown={onMouseDown('left')}
                        data-testid="resize-handle-left"
                    />

                    <div
                        className="overflow-hidden shrink-0"
                        style={{ width: `${colWidths.center}%` }}
                        data-testid="pane-editor"
                    >
                        <CodeEditor />
                    </div>

                    <div
                        className="w-1 shrink-0 cursor-col-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors"
                        onMouseDown={onMouseDown('right')}
                        data-testid="resize-handle-right"
                    />

                    <div className="overflow-hidden flex-1" data-testid="pane-preview">
                        <Preview />
                    </div>
                </div>

                <div
                    className="h-1 shrink-0 cursor-row-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors border-t border-[#21262d]"
                    onMouseDown={onMouseDown('terminal')}
                    data-testid="resize-handle-terminal"
                />

                <div
                    className="overflow-hidden shrink-0 border-t border-[#30363d]"
                    style={{ height: `${termHeight}%` }}
                    data-testid="pane-terminal"
                >
                    <Terminal onReady={handleTerminalReady} onData={handleTerminalData} />
                </div>
            </div>
        </div>
    )
}
