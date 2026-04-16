import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { GameProvider } from './context/GameContext.jsx'
import { UIProvider } from './hooks/useUIState.jsx'
import { EffectProvider } from './context/EffectContext.jsx'
import { AudioProvider } from './context/AudioContext.jsx'
import { EncounterProvider } from './context/EncounterContext.jsx'
import { SaveProvider } from './context/SaveContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UIProvider>
      <EffectProvider>
        <AudioProvider>
          <EncounterProvider>
            <SaveProvider>
              <GameProvider>
                <App />
              </GameProvider>
            </SaveProvider>
          </EncounterProvider>
        </AudioProvider>
      </EffectProvider>
    </UIProvider>
  </StrictMode>,
)
