import { useEffect, useState } from 'react'
import GameWrapper from './components/GameWrapper'
import HomeScreen from './components/HomeScreen'
import SettingsScreen from './components/SettingsScreen'
import Toast from './components/Toast'
import UserSetup from './components/UserSetup'
import { usePlayerData } from './hooks/usePlayerData'

const DEFAULT_THEME = { mode: 'dark', color: 'violet' }

function readThemeSettings() {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('wordmaster_theme') || '{}') }
  } catch {
    return DEFAULT_THEME
  }
}

function App() {
  const [screen, setScreen] = useState('setup')
  const [gameParams, setGameParams] = useState(null)
  const [toast, setToast] = useState(null)
  const [themeSettings, setThemeSettings] = useState(readThemeSettings)
  const {
    player, selectPlayer, saveProgress, switchPlayer, getLeaderboard,
    storageWarning,
  } = usePlayerData()

  function showToast(message, type = 'info') {
    setToast({ message, type, id: Date.now() })
  }

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (player && screen === 'setup') setScreen('home')
  }, [player, screen])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeSettings.mode
    root.dataset.color = themeSettings.color
    try {
      localStorage.setItem('wordmaster_theme', JSON.stringify(themeSettings))
    } catch {
      // The selected theme still applies for this session.
    }
  }, [themeSettings])

  function handleGameComplete(gameKey, score, xpEarned, nextLevel) {
    saveProgress(gameKey, { score, levelReached: nextLevel, xpEarned })
    setGameParams({ gameKey, level: nextLevel })
  }

  return (
    <>
      {screen === 'setup' && (
        <UserSetup onConfirm={(username) => { selectPlayer(username); setScreen('home') }} />
      )}
      {screen === 'home' && player && (
        <HomeScreen
          player={player}
          getLeaderboard={getLeaderboard}
          onPlayGame={(gameKey) => {
            setGameParams({ gameKey, level: player.games[gameKey].level })
            setScreen('game')
          }}
          onSwitchPlayer={() => { switchPlayer(); setScreen('setup') }}
        />
      )}
      {screen === 'home' && player && (
        <button className="settings-fab" onClick={() => setScreen('settings')} aria-label="Open settings">⚙</button>
      )}
      {screen === 'settings' && (
        <SettingsScreen
          settings={themeSettings}
          onChange={setThemeSettings}
          onBack={() => setScreen(player ? 'home' : 'setup')}
        />
      )}
      {screen === 'game' && gameParams && (
        <GameWrapper
          gameKey={gameParams.gameKey}
          level={gameParams.level}
          onBack={() => setScreen('home')}
          onComplete={(score, xpEarned, nextLevel) =>
            handleGameComplete(gameParams.gameKey, score, xpEarned, nextLevel)}
          showToast={showToast}
        />
      )}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
      {!toast && storageWarning && (
        <Toast message="Storage unavailable. Progress will last for this session." type="info" />
      )}
    </>
  )
}

export default App
