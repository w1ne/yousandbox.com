import { useState, useRef } from 'react'

interface Props {
    onRefresh?: (port: number) => Promise<string>
    isRunning?: boolean
}

export default function Preview({ onRefresh, isRunning = false }: Props) {
    const [port, setPort] = useState(8080)
    const [srcDoc, setSrcDoc] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const handleRefresh = async () => {
        if (!onRefresh) return
        setLoading(true)
        setError(null)
        try {
            const raw = await onRefresh(port)
            // Strip HTTP headers — keep only the body
            const headerEnd = raw.indexOf('\r\n\r\n')
            const body = headerEnd === -1 ? raw : raw.slice(headerEnd + 4)
            setSrcDoc(body)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full flex flex-col" data-testid="preview-pane">
            {/* toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
                <span className="text-[#8b949e] text-xs">Port</span>
                <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    className="w-20 rounded bg-[#0d1117] border border-[#30363d] text-[#e6edf3] text-xs px-2 py-1 focus:outline-none focus:border-[#58a6ff]"
                    data-testid="preview-port-input"
                    min={1}
                    max={65535}
                />
                <button
                    onClick={handleRefresh}
                    disabled={!isRunning || loading}
                    className="rounded px-3 py-1 text-xs font-semibold bg-[#21262d] text-[#e6edf3] border border-[#30363d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="preview-refresh"
                >
                    {loading ? 'Loading…' : 'Refresh'}
                </button>
            </div>

            {/* content */}
            <div className="flex-1 relative overflow-hidden">
                {srcDoc !== null ? (
                    <iframe
                        ref={iframeRef}
                        srcDoc={srcDoc}
                        sandbox="allow-scripts"
                        className="w-full h-full border-0 bg-white"
                        data-testid="preview-iframe"
                        title="Sandbox preview"
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-[#8b949e] text-sm text-center p-4">
                        {error ? (
                            <span className="text-red-400">{error}</span>
                        ) : (
                            'Start a server inside the sandbox, then click Refresh'
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
