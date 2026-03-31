import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
})

const root = ReactDOM.createRoot(document.getElementById('root'))

if (window.location.pathname === '/ops') {
  import('./OpsHealth').then(({ default: OpsHealth }) => {
    root.render(<OpsHealth />)
  })
} else {
  import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
}