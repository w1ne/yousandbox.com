export default function FileTree() {
    return (
        <div
            className="h-full overflow-auto p-2 text-[#8b949e] text-xs"
            data-testid="file-tree"
        >
            <p className="font-semibold text-[#e6edf3] mb-2 uppercase tracking-wide text-[10px] px-1">
                Files
            </p>
            <p className="italic text-[#484f58] px-1">No files yet</p>
        </div>
    )
}
