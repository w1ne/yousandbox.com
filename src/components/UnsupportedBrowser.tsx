export default function UnsupportedBrowser() {
    return (
        <div
            className="flex h-screen w-screen items-center justify-center bg-[#0d1117] text-[#e6edf3]"
            data-testid="unsupported-browser"
        >
            <div className="max-w-md rounded-xl border border-[#30363d] bg-[#161b22] p-10 text-center">
                <h1 className="mb-3 text-xl font-bold">Browser not supported</h1>
                <p className="mb-6 text-sm text-[#8b949e]">
                    yousandbox requires{' '}
                    <strong className="text-[#e6edf3]">Chrome 92+</strong> or{' '}
                    <strong className="text-[#e6edf3]">Edge 92+</strong> for{' '}
                    <code className="rounded bg-[#21262d] px-1">SharedArrayBuffer</code> support.
                </p>
                <p className="text-xs text-[#8b949e]">
                    Safari and Firefox do not support the features needed to run Linux locally.
                </p>
            </div>
        </div>
    )
}
