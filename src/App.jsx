import { useEffect, useRef, useState } from 'react'
import GameWrapper from './components/GameWrapper'
import HomeScreen from './components/HomeScreen'
import SettingsScreen from './components/SettingsScreen'
import Toast from './components/Toast'
import UserSetup from './components/UserSetup'
import { usePlayerData } from './hooks/usePlayerData'

const DEFAULT_THEME = { mode: 'dark', color: 'violet' }
const ROUTE_STORAGE_KEY = 'wordmaster_route'

function readThemeSettings() {
  try {
    return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('wordmaster_theme') || '{}') }
  } catch {
    return DEFAULT_THEME
  }
}

function readSavedRoute() {
  try {
    const route = JSON.parse(localStorage.getItem(ROUTE_STORAGE_KEY) || '{}')
    if (route.screen === 'game' && route.gameParams?.gameKey) return route
    if (route.screen === 'settings' || route.screen === 'home' || route.screen === 'setup') {
      return { screen: route.screen, gameParams: null }
    }
  } catch {
    // Start fresh if the saved route cannot be read.
  }
  return { screen: 'setup', gameParams: null }
}

function makeRoute(screen, gameParams = null, routeIndex = 0) {
  return {
    wordmasterRoute: true,
    routeIndex,
    screen,
    gameParams: screen === 'game' ? gameParams : null,
  }
}

function App() {
  const [savedRoute] = useState(readSavedRoute)
  const routeIndexRef = useRef(window.history.state?.routeIndex || 0)
  const [screen, setScreen] = useState(savedRoute.screen)
  const [gameParams, setGameParams] = useState(savedRoute.gameParams)
  const [toast, setToast] = useState(null)
  const [themeSettings, setThemeSettings] = useState(readThemeSettings)
  const {
    player, selectPlayer, saveProgress, connectAccount, switchPlayer, getLeaderboard,
    syncStatus, syncError, storageWarning,
  } = usePlayerData()

  function showToast(message, type = 'info') {
    setToast({ message, type, id: Date.now() })
  }

  function storeRoute(nextScreen, nextGameParams = null) {
    try {
      localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(makeRoute(nextScreen, nextGameParams, routeIndexRef.current)))
    } catch {
      // Navigation still works for this session.
    }
  }

  function applyRoute(route) {
    const nextScreen = route?.screen || 'home'
    routeIndexRef.current = route?.routeIndex || 0
    setScreen(nextScreen)
    setGameParams(nextScreen === 'game' ? route.gameParams : null)
    storeRoute(nextScreen, nextScreen === 'game' ? route.gameParams : null)
  }

  function navigate(nextScreen, nextGameParams = null, { replace = false } = {}) {
    const routeIndex = replace ? routeIndexRef.current : routeIndexRef.current + 1
    routeIndexRef.current = routeIndex
    const route = makeRoute(nextScreen, nextGameParams, routeIndex)
    setScreen(route.screen)
    setGameParams(route.gameParams)
    storeRoute(route.screen, route.gameParams)
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](route, '', window.location.href)
  }

  function goBack(fallbackScreen = 'home') {
    if (routeIndexRef.current > 0) {
      window.history.back()
      return
    }
    navigate(fallbackScreen, null, { replace: true })
  }

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    window.history.replaceState(makeRoute(screen, gameParams, routeIndexRef.current), '', window.location.href)
    storeRoute(screen, gameParams)
    function handlePopState(event) {
      applyRoute(event.state?.wordmasterRoute ? event.state : readSavedRoute())
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (player && screen === 'setup') navigate('home', null, { replace: true })
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
    navigate('game', { gameKey, level: nextLevel }, { replace: true })
  }

  return (
    <>
      {screen === 'setup' && (
        <UserSetup onConfirm={(username) => { selectPlayer(username); navigate('home') }} />
      )}
      {screen === 'home' && player && (
        <HomeScreen
          player={player}
          getLeaderboard={getLeaderboard}
          onPlayGame={(gameKey) => {
            navigate('game', { gameKey, level: player.games[gameKey].level })
          }}
          onSwitchPlayer={() => { switchPlayer(); navigate('setup') }}
        />
      )}
      {screen === 'home' && player && (
        <button className="settings-fab" onClick={() => navigate('settings')} aria-label="Open settings">⚙</button>
      )}
      {screen === 'settings' && (
        <SettingsScreen
          player={player}
          settings={themeSettings}
          onChange={setThemeSettings}
          onConnectAccount={connectAccount}
          syncStatus={syncStatus}
          syncError={syncError}
          onBack={() => goBack(player ? 'home' : 'setup')}
        />
      )}
      {screen === 'game' && gameParams && player && (
        <GameWrapper
          gameKey={gameParams.gameKey}
          level={gameParams.level}
          unlockedLevel={Math.max(player?.games?.[gameParams.gameKey]?.level || 1, gameParams.level)}
          onBack={() => goBack('home')}
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
