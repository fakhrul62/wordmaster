import { useEffect, useRef, useState } from 'react'
import GameWrapper from './components/GameWrapper'
import HomeScreen from './components/HomeScreen'
import SettingsScreen from './components/SettingsScreen'
import Toast from './components/Toast'
import UserSetup from './components/UserSetup'
import { usePlayerData } from './hooks/usePlayerData'
import { readSoundPreference, writeSoundPreference } from './utils/audio'
import { decodeChallengeURL } from './utils/challenge'
import { readHapticsPreference, writeHapticsPreference } from './utils/haptics'
import { getGameTrack } from './utils/progression'

const DEFAULT_THEME = { mode: 'dark', color: 'violet', soundEnabled: true, hapticsEnabled: true }
const ROUTE_STORAGE_KEY = 'wordmaster_route'

function readThemeSettings() {
  try {
    return {
      ...DEFAULT_THEME,
      ...JSON.parse(localStorage.getItem('wordmaster_theme') || '{}'),
      soundEnabled: readSoundPreference(),
      hapticsEnabled: readHapticsPreference(),
    }
  } catch {
    return { ...DEFAULT_THEME, soundEnabled: readSoundPreference(), hapticsEnabled: readHapticsPreference() }
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
  const challengeHandledRef = useRef(false)
  const [screen, setScreen] = useState(savedRoute.screen)
  const [gameParams, setGameParams] = useState(savedRoute.gameParams)
  const [toast, setToast] = useState(null)
  const [themeSettings, setThemeSettings] = useState(readThemeSettings)
  const {
    player, selectPlayer, saveProgress, selectGameMode, selectDifficulty, selectTimerMode, selectWordPack,
    spendCoins, unlockWordPack, setNotificationsEnabled, connectAccount, switchPlayer, getLeaderboard,
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

  function goHome() {
    navigate('home', null, { replace: true })
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
    if (!player || challengeHandledRef.current) return
    const challenge = decodeChallengeURL()
    if (!challenge) return
    challengeHandledRef.current = true
    navigate('game', { ...routeForGame(challenge.gameKey), challengeSeed: challenge.seed }, { replace: true })
    showToast('Challenge from a friend — same puzzle!', 'info')
  }, [player])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = themeSettings.mode
    root.dataset.color = themeSettings.color
    writeSoundPreference(themeSettings.soundEnabled)
    writeHapticsPreference(themeSettings.hapticsEnabled)
    try {
      localStorage.setItem('wordmaster_theme', JSON.stringify(themeSettings))
    } catch {
      // The selected theme still applies for this session.
    }
  }, [themeSettings])

  function routeForGame(gameKey, mode = null) {
    const progress = player.games[gameKey]
    const selectedMode = gameKey === 'boggle' && (mode || progress.selectedMode)
      ? Number(mode || progress.selectedMode)
      : null
    const track = getGameTrack(progress, gameKey, selectedMode)
    return { gameKey, level: track.level, mode: selectedMode }
  }

  function handleGameComplete(gameKey, score, xpEarned, nextLevel, options = {}) {
    const mode = options.mode ? Number(options.mode) : null
    saveProgress(gameKey, {
      score,
      levelReached: nextLevel,
      xpEarned,
      mode,
      completionTime: options.completionTime,
      difficulty: options.difficulty,
      timerMode: options.timerMode,
      activePack: options.activePack,
    })
    navigate('game', { gameKey, level: nextLevel, mode }, { replace: true })
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
          onUnlockWordPack={unlockWordPack}
          showToast={showToast}
          onPlayGame={(gameKey) => {
            navigate('game', routeForGame(gameKey))
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
          onNotificationsChange={setNotificationsEnabled}
          syncStatus={syncStatus}
          syncError={syncError}
          onBack={() => goBack(player ? 'home' : 'setup')}
        />
      )}
      {screen === 'game' && gameParams && player && (
        <GameWrapper
          gameKey={gameParams.gameKey}
          level={gameParams.level}
          mode={gameParams.mode}
          challengeSeed={gameParams.challengeSeed}
          player={player}
          settings={themeSettings}
          gameProgress={player.games[gameParams.gameKey]}
          unlockedLevel={Math.max(
            getGameTrack(player.games[gameParams.gameKey], gameParams.gameKey, gameParams.mode).level,
            gameParams.level,
          )}
          onBack={() => goBack('home')}
          onHome={goHome}
          onModeSelect={(mode, modeLevel) => {
            selectGameMode(gameParams.gameKey, mode)
            navigate('game', { gameKey: gameParams.gameKey, level: modeLevel, mode }, { replace: true })
          }}
          onDifficultySelect={selectDifficulty}
          onTimerModeSelect={selectTimerMode}
          onPackSelect={selectWordPack}
          spendCoins={spendCoins}
          onComplete={(score, xpEarned, nextLevel, options) =>
            handleGameComplete(gameParams.gameKey, score, xpEarned, nextLevel, options)}
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
