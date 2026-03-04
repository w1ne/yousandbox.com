import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CodeEditor from './CodeEditor'

vi.mock('@monaco-editor/react', () => ({
    default: ({ loading }: { loading: React.ReactNode }) => (
        <div data-testid="monaco-editor">{loading}</div>
    ),
}))

describe('CodeEditor', () => {
    it('mounts without errors', () => {
        render(<CodeEditor />)
        expect(screen.getByTestId('code-editor')).toBeInTheDocument()
    })

    it('renders Monaco editor container', () => {
        render(<CodeEditor language="python" value="print('hello')" />)
        expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
    })

    it('renders loading placeholder inside Monaco', () => {
        render(<CodeEditor />)
        expect(screen.getByText('Loading editor…')).toBeInTheDocument()
    })
})
