import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// StrictMode removed: causes Supabase auth lock timeout in dev
// (double-mount orphans the lock and delays auth by 5s)
createRoot(document.getElementById('root')).render(<App />)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
