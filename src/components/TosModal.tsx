interface Props {
    onAccept: () => void
}

export default function TosModal({ onAccept }: Props) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            data-testid="tos-modal"
        >
            <div className="mx-4 max-w-lg rounded-xl border border-[#30363d] bg-[#161b22] p-8 text-[#e6edf3]">
                <h2 className="mb-4 text-xl font-semibold">Before you start</h2>
                <p className="mb-4 text-sm text-[#8b949e]">
                    YouSandbox runs a real Linux environment entirely in your browser. By
                    continuing you agree that you will not use it for illegal activity, abuse, or
                    to harm others. The sandbox is ephemeral — everything is wiped when you close
                    the tab.
                </p>
                <p className="mb-6 text-sm text-[#8b949e]">
                    Read our full{' '}
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#58a6ff] underline"
                    >
                        Terms of Service
                    </a>
                    .
                </p>
                <button
                    data-testid="tos-accept"
                    onClick={onAccept}
                    className="w-full rounded-lg bg-[#238636] px-4 py-2 font-semibold text-white hover:bg-[#2ea043] focus:outline-none focus:ring-2 focus:ring-[#238636]"
                >
                    I agree — continue
                </button>
            </div>
        </div>
    )
}
