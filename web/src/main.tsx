import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// IBM Plex fonts bundled offline (no Google Fonts CDN) — weights used by the UI
import '@fontsource/ibm-plex-sans-thai/300.css'
import '@fontsource/ibm-plex-sans-thai/400.css'
import '@fontsource/ibm-plex-sans-thai/500.css'
import '@fontsource/ibm-plex-sans-thai/600.css'
import '@fontsource/ibm-plex-sans-thai/700.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
// extra Thai fonts users can pick for text/price elements (regular + bold)
import '@fontsource/sarabun/400.css'
import '@fontsource/sarabun/700.css'
import '@fontsource/kanit/400.css'
import '@fontsource/kanit/700.css'
import '@fontsource/prompt/400.css'
import '@fontsource/prompt/700.css'
import '@fontsource/mitr/400.css'
import '@fontsource/mitr/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
