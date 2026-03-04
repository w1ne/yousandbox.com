export default function App() {
    return (
        <div className="flex flex-col h-screen bg-[#0d1117] text-[#e6edf3]">
            {/* Top bar */}
            <header className="flex items-center gap-4 px-4 py-2 border-b border-[#30363d] bg-[#161b22] shrink-0">
                <span className="font-bold tracking-tight text-sm">yousandbox</span>
                <span className="text-[#8b949e] text-xs ml-auto">Phase 1 — scaffold ✓</span>
            </header>

            {/* Main content area */}
            <main className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <p className="text-2xl font-semibold text-[#58a6ff]">yousandbox.com</p>
                    <p className="text-[#8b949e] text-sm">Zero-install Linux in your browser.</p>
                    <p className="text-[#8b949e] text-xs">Scaffold ready. Next: Monaco + 4-pane layout.</p>
                </div>
            </main>
        </div>
    )
}
