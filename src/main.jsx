import { createRoot } from 'react-dom/client'
import './index.css'
import { TiendaProvider } from './context/TiendaContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <TiendaProvider>
    <App />
  </TiendaProvider>
)
