import { useState, useRef, useCallback, useEffect } from 'react'
import FileTree from './components/layout/FileTree'
import CodeEditor from './components/layout/CodeEditor'
import Preview from './components/layout/Preview'
import Terminal from './components/layout/Terminal'
import { adjustLeftHandle, adjustRightHandle, PaneWidths } from './lib/layout/paneResize'

const INITIAL_COL_WIDTHS: PaneWidths = { left: 15, center: 52, right: 33 }
const INITIAL_TERM_HEIGHT = 30 // % of total height
const MIN_TERM_HEIGHT = 15
const MAX_TERM_HEIGHT = 60

interface DragState {
    type: 'left' | 'right' | 'terminal'
    startX: number
    startY: number
    startWidths: PaneWidths
    startTermHeight: number
}

export default function App() {
    const [colWidths, setColWidths] = useState<PaneWidths>(INITIAL_COL_WIDTHS)
    const [termHeight, setTermHeight] = useState(INITIAL_TERM_HEIGHT)
    const containerRef = useRef<HTMLDivElement>(null)
    const dragRef = useRef<DragState | null>(null)

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
                    defaultValue="python"
                    aria-label="Flavor"
                >
                    <option value="python">Python &amp; Data</option>
                </select>
                <select
                    className="bg-[#21262d] border border-[#30363d] rounded px-2 py-1 text-xs text-[#e6edf3] cursor-pointer"
                    defaultValue="persistent"
                    aria-label="Mode"
                >
                    <option value="persistent">Persistent</option>
                    <option value="burner">Burner</option>
                </select>
                <button
                    className="ml-2 bg-[#238636] hover:bg-[#2ea043] active:bg-[#26a641] text-white text-xs px-3 py-1 rounded font-semibold transition-colors"
                    aria-label="Boot sandbox"
                >
                    Boot
                </button>
            </header>

            {/* Body: columns + terminal */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Three-column row */}
                <div
                    className="flex overflow-hidden"
                    style={{ height: `${100 - termHeight}%` }}
                    data-testid="columns-row"
                >
                    {/* Files pane */}
                    <div
                        className="overflow-hidden shrink-0"
                        style={{ width: `${colWidths.left}%` }}
                        data-testid="pane-files"
                    >
                        <FileTree />
                    </div>

                    {/* Left resize handle */}
                    <div
                        className="w-1 shrink-0 cursor-col-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors"
                        onMouseDown={onMouseDown('left')}
                        data-testid="resize-handle-left"
                    />

                    {/* Editor pane */}
                    <div
                        className="overflow-hidden shrink-0"
                        style={{ width: `${colWidths.center}%` }}
                        data-testid="pane-editor"
                    >
                        <CodeEditor />
                    </div>

                    {/* Right resize handle */}
                    <div
                        className="w-1 shrink-0 cursor-col-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors"
                        onMouseDown={onMouseDown('right')}
                        data-testid="resize-handle-right"
                    />

                    {/* Preview pane — takes remaining space */}
                    <div className="overflow-hidden flex-1" data-testid="pane-preview">
                        <Preview />
                    </div>
                </div>

                {/* Terminal resize handle */}
                <div
                    className="h-1 shrink-0 cursor-row-resize bg-[#30363d] hover:bg-[#58a6ff] transition-colors border-t border-[#21262d]"
                    onMouseDown={onMouseDown('terminal')}
                    data-testid="resize-handle-terminal"
                />

                {/* Terminal pane */}
                <div
                    className="overflow-hidden shrink-0 border-t border-[#30363d]"
                    style={{ height: `${termHeight}%` }}
                    data-testid="pane-terminal"
                >
                    <Terminal />
                </div>
            </div>
        </div>
    )
}
