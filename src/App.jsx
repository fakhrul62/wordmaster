import { useEffect, useState } from 'react'
import GameWrapper from './components/GameWrapper'
import HomeScreen from './components/HomeScreen'
import Toast from './components/Toast'
import UserSetup from './components/UserSetup'
import { usePlayerData } from './hooks/usePlayerData'

function App() {
  const [screen, setScreen] = useState('setup')
  const [gameParams, setGameParams] = useState(null)
  const [toast, setToast] = useState(null)
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
