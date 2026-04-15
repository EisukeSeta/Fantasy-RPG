import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { GameProvider } from './context/GameContext.jsx'
import { UIProvider } from './hooks/useUIState.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GameProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </GameProvider>
  </StrictMode>,
)
