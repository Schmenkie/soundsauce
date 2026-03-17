import './index.css'
import { validateEnv } from './utils/validateEnv'
validateEnv()

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { initSentry } from './lib/sentry'
import { initPostHog } from './lib/posthog'
import { initWebVitals } from './lib/webVitals'
import App from './App.jsx'

// Initialize error monitoring first, then analytics
try { initSentry(); } catch (err) { console.warn('Sentry init failed:', err); }
try { initPostHog(); } catch (err) { console.warn('PostHog init failed:', err); }
try { initWebVitals(); } catch { /* noop */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
