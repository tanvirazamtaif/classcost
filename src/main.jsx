import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import V2App from './v2/V2App.jsx'
import { ErrorBoundary } from './components/feature/ErrorBoundary'

// v2 preview flag: visit ?v2 to enable, ?v2=off to disable. Choice persists in localStorage,
// so the live app (v1) stays the default and the rebuild is opt-in.
const sp = new URLSearchParams(window.location.search)
if (sp.has('v2')) {
  if (sp.get('v2') === 'off') localStorage.removeItem('cc_v2')
  else localStorage.setItem('cc_v2', '1')
}
const showV2 = localStorage.getItem('cc_v2') === '1'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {showV2 ? <V2App /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>,
)
