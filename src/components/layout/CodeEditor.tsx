import MonacoEditor from '@monaco-editor/react'

interface CodeEditorProps {
    value?: string
    language?: 'python' | 'javascript' | 'typescript'
    onChange?: (value: string | undefined) => void
}

export default function CodeEditor({
    value = '',
    language = 'python',
    onChange,
}: CodeEditorProps) {
    return (
        <div className="h-full w-full" data-testid="code-editor">
            <MonacoEditor
                height="100%"
                language={language}
                value={value}
                onChange={onChange}
                theme="vs-dark"
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                }}
                loading={
                    <div className="flex items-center justify-center h-full text-[#8b949e] text-sm">
                        Loading editor…
                    </div>
                }
            />
        </div>
    )
}
