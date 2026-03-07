import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import UnsupportedBrowser from './components/UnsupportedBrowser'
import { isSupported } from './lib/browser'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
    <StrictMode>
        {isSupported() ? <App /> : <UnsupportedBrowser />}
    </StrictMode>,
)
