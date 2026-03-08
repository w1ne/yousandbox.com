import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
    /** Called once when the xterm Terminal is ready. Store the ref to pass to V86Engine. */
    onReady?: (terminal: XTerm) => void
    /** Called on every keystroke from the user so the parent can forward to V86. */
    onData?: (data: string) => void
}

export default function Terminal({ onReady, onData }: TerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<XTerm | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const term = new XTerm({
            theme: {
                background: '#0d1117',
                foreground: '#e6edf3',
                cursor: '#58a6ff',
                black: '#484f58',
                brightBlack: '#6e7681',
            },
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
            cursorBlink: true,
            scrollback: 5000,
        })

        const fitAddon = new FitAddon()
        term.loadAddon(fitAddon)
        term.open(containerRef.current)
        fitAddon.fit()

        term.writeln('\x1b[2m─── yousandbox terminal ───\x1b[0m')
        term.writeln('\x1b[2mClick Boot to start the sandbox.\x1b[0m')
        term.writeln('')

        xtermRef.current = term
        fitAddonRef.current = fitAddon
        onReady?.(term)

        const dataDisposable = term.onData((data) => onData?.(data))

        const ro = new ResizeObserver(() => fitAddon.fit())
        ro.observe(containerRef.current)

        return () => {
            dataDisposable.dispose()
            ro.disconnect()
            term.dispose()
            xtermRef.current = null
            fitAddonRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // intentionally empty — term is created once; callbacks captured via stable refs

    return (
        <div
            ref={containerRef}
            className="h-full w-full bg-[#0d1117] overflow-hidden"
            data-testid="terminal"
        />
    )
}
