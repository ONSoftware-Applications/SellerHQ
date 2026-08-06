import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { captureError } from './lib/errorLog'

window.addEventListener('error', (event) => {
  captureError(event.error ?? event.message, 'window.onerror')
})

window.addEventListener('unhandledrejection', (event) => {
  captureError(event.reason, 'unhandledrejection')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
