import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import V2App from './v2/V2App.jsx'
import { ErrorBoundary } from './components/feature/ErrorBoundary'

// v2 is the default app. Escape hatch: visit ?v2=off to fall back to v1 (persists in
// localStorage); ?v2 (or ?v2=on) clears the override and returns to the v2 default.
const sp = new URLSearchParams(window.location.search)
if (sp.has('v2')) {
  if (sp.get('v2') === 'off') localStorage.setItem('cc_v2', '0')
  else localStorage.removeItem('cc_v2')
}
const showV2 = localStorage.getItem('cc_v2') !== '0'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {showV2 ? <V2App /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
