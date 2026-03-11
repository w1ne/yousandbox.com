export default function HelpTab() {
    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto bg-[#0d1117] text-[#e6edf3]">
            <h2 className="text-2xl font-bold mb-4">Welcome to yousandbox</h2>

            <p className="mb-6 text-sm text-[#8b949e] leading-relaxed">
                <strong>Zero-install Linux in your browser.</strong> yousandbox runs a real Alpine Linux
                environment entirely inside your browser tab using WebAssembly. Everything executes
                locally on your hardware — no data ever leaves your machine. Once you close
                the tab, the entire sandbox is securely wiped.
            </p>

            <h3 className="text-lg font-semibold mb-3 border-b border-[#30363d] pb-2">How to use</h3>
            <ul className="list-disc pl-5 mb-6 text-sm text-[#8b949e] space-y-2">
                <li><strong>Boot:</strong> Click the Boot button in the top bar to start the Linux virtual machine.</li>
                <li><strong>Files:</strong> Drag and drop any file directly into the sandbox to upload it.</li>
                <li><strong>Editor:</strong> Use the built-in Monaco code editor. Your code is saved directly to the virtual filesystem.</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3 border-b border-[#30363d] pb-2">Examples</h3>

            <div className="space-y-4">
                <div className="rounded border border-[#30363d] bg-[#161b22] p-4 text-sm text-[#8b949e]">
                    <h4 className="font-semibold text-[#e6edf3] mb-2">🐍 Python & Data Flavor</h4>
                    <p className="mb-2">Run a simple HTTP server to preview your files:</p>
                    <code className="block bg-[#0d1117] p-2 rounded text-xs px-3 font-mono border border-[#30363d] mb-2">
                        python3 -m http.server 8080
                    </code>
                    <p className="text-xs">Then switch to the <strong>Preview</strong> tab and click Refresh to view the server output.</p>
                </div>

                <div className="rounded border border-[#30363d] bg-[#161b22] p-4 text-sm text-[#8b949e]">
                    <h4 className="font-semibold text-[#e6edf3] mb-2">🌐 Web Dev Flavor</h4>
                    <p className="mb-2">Use Node.js to spin up a quick server or run scripts:</p>
                    <code className="block bg-[#0d1117] p-2 rounded text-xs px-3 font-mono border border-[#30363d] mb-2">
                        npm init -y<br />
                        npm install express<br />
                        node server.js
                    </code>
                    <p className="text-xs">Supports npm, git, and curl out of the box.</p>
                </div>
            </div>
        </div>
    )
}
