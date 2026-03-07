export default function FileTree({
    files = [],
    isUploading = false,
}: {
    files?: string[]
    isUploading?: boolean
}) {
    return (
        <div
            className="h-full overflow-auto p-2 text-[#8b949e] text-xs"
            data-testid="file-tree"
        >
            <p className="font-semibold text-[#e6edf3] mb-2 uppercase tracking-wide text-[10px] px-1">
                Files
            </p>
            {files.length === 0 && !isUploading && (
                <p className="italic text-[#484f58] px-1">No files yet</p>
            )}
            <ul className="space-y-1">
                {files.map((file) => (
                    <li
                        key={file}
                        className="flex items-center gap-2 px-1 py-1 hover:bg-[#21262d] rounded cursor-pointer transition-colors"
                    >
                        <span className="text-xl">📄</span>
                        <span className="truncate">{file}</span>
                    </li>
                ))}
                {isUploading && (
                    <li className="flex items-center gap-2 px-1 py-1 text-[#58a6ff] animate-pulse">
                        <span className="text-xl">⏳</span>
                        <span>Uploading…</span>
                    </li>
                )}
            </ul>
        </div>
    )
}
