import { useCallback, useEffect, useState } from 'react'
import {
  applyProgressUpdate,
  buildLeaderboard,
  BOGGLE_MODES,
  createGameProgress,
  createGames,
  DIFFICULTIES,
  getTitleForXP,
  refreshDailyEngagement,
  todayKey,
} from '../utils/progression'
import { normalizeUsername } from '../utils/wordUtils'

const GUEST_NAME = 'Guest'

function createPlayer(username = GUEST_NAME, accountEmail = '') {
  return {
    username: username.trim() || GUEST_NAME,
    accountEmail,
    isGuest: !accountEmail,
    totalXP: 0,
    totalPoints: 0,
    coins: 0,
    unlockedPacks: [],
    notificationsEnabled: false,
    pushSubscription: null,
    gamesPlayed: 0,
    dailyChallengesCompleted: 0,
    eventMissionsCompleted: 0,
    achievements: [],
    titles: ['Beginner Explorer'],
    activeTitle: 'Beginner Explorer',
    recentUnlocks: [],
    daily: null,
    events: {},
    streak: {
      count: 0,
      best: 0,
      lastLogin: '',
      reward: { coins: 0, xp: 0, points: 0 },
    },
    lastLogin: '',
    lastPlayed: todayKey(),
    games: createGames(),
  }
}

const playerKey = (username) => `wordmaster_player_${normalizeUsername(username || GUEST_NAME)}`
const accountKey = (email) => `wordmaster_account_${normalizeUsername(email)}`

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function localKeyForPlayer(player) {
  return player.accountEmail ? accountKey(player.accountEmail) : playerKey(player.username)
}

function normalizePlayer(player, fallbackUsername = GUEST_NAME, accountEmail = '') {
  const base = createPlayer(fallbackUsername, accountEmail)
  const totalXP = Math.max(0, Number(player?.totalXP) || 0)
  const titles = Array.isArray(player?.titles) && player.titles.length
    ? player.titles
    : [getTitleForXP(totalXP)]
  return {
    ...base,
    ...player,
    username: String(player?.username || fallbackUsername || GUEST_NAME).trim(),
    accountEmail: normalizeEmail(player?.accountEmail || accountEmail),
    isGuest: !normalizeEmail(player?.accountEmail || accountEmail),
    totalXP,
    totalPoints: Math.max(0, Number(player?.totalPoints) || Number(player?.totalXP) || 0),
    coins: Math.max(0, Number(player?.coins) || 0),
    unlockedPacks: Array.isArray(player?.unlockedPacks) ? player.unlockedPacks : [],
    notificationsEnabled: Boolean(player?.notificationsEnabled),
    pushSubscription: player?.pushSubscription || null,
    gamesPlayed: Math.max(0, Number(player?.gamesPlayed) || 0),
    dailyChallengesCompleted: Math.max(0, Number(player?.dailyChallengesCompleted) || 0),
    eventMissionsCompleted: Math.max(0, Number(player?.eventMissionsCompleted) || 0),
    achievements: Array.isArray(player?.achievements) ? player.achievements : [],
    titles,
    activeTitle: player?.activeTitle || titles.at(-1) || getTitleForXP(totalXP),
    recentUnlocks: Array.isArray(player?.recentUnlocks) ? player.recentUnlocks.slice(0, 8) : [],
    daily: player?.daily || null,
    events: player?.events && typeof player.events === 'object' ? player.events : {},
    streak: {
      ...base.streak,
      ...(player?.streak || {}),
      count: Math.max(0, Number(player?.streak?.count) || 0),
      best: Math.max(0, Number(player?.streak?.best) || Number(player?.streak?.count) || 0),
    },
    lastLogin: player?.lastLogin || player?.streak?.lastLogin || '',
    lastPlayed: player?.lastPlayed || todayKey(),
    games: createGames(player?.games),
  }
}

function readPlayer(username = GUEST_NAME) {
  try {
    const stored = localStorage.getItem(playerKey(username))
    if (!stored) return createPlayer(username)
    return normalizePlayer(JSON.parse(stored), username)
  } catch {
    return createPlayer(username)
  }
}

function readCurrentPlayer() {
  const current = localStorage.getItem('wordmaster_current_user')
  if (!current) return null
  if (current.startsWith('account:')) {
    const email = current.slice('account:'.length)
    const stored = localStorage.getItem(accountKey(email))
    return stored ? normalizePlayer(JSON.parse(stored), email.split('@')[0], email) : createPlayer(email.split('@')[0], email)
  }
  return readPlayer(current)
}

function writeCurrentPlayer(player) {
  localStorage.setItem(localKeyForPlayer(player), JSON.stringify(player))
  localStorage.setItem(
    'wordmaster_current_user',
    player.accountEmail ? `account:${player.accountEmail}` : player.username,
  )
}

async function syncAccount(email, player) {
  const response = await fetch('/api/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, player }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Account sync failed.')
  return refreshDailyEngagement(normalizePlayer(payload.player, email.split('@')[0], email))
}

function readStoredPlayers() {
  return Object.keys(localStorage)
    .filter((key) => key.startsWith('wordmaster_player_') || key.startsWith('wordmaster_account_'))
    .map((key) => normalizePlayer(JSON.parse(localStorage.getItem(key))))
}

export function usePlayerData() {
  const [player, setPlayer] = useState(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [syncStatus, setSyncStatus] = useState('local')
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    try {
      const storedPlayer = readCurrentPlayer()
      if (storedPlayer) {
        const refreshedPlayer = refreshDailyEngagement(storedPlayer)
        setPlayer(refreshedPlayer)
        writeCurrentPlayer(refreshedPlayer)
        setSyncStatus(refreshedPlayer.accountEmail ? 'syncing' : 'local')
        if (refreshedPlayer.accountEmail) {
          syncAccount(refreshedPlayer.accountEmail, refreshedPlayer)
            .then((synced) => {
              setPlayer(synced)
              setSyncStatus('synced')
              writeCurrentPlayer(synced)
            })
            .catch((error) => {
              setSyncStatus('error')
              setSyncError(error.message)
            })
        }
      } else {
        const guest = refreshDailyEngagement(createPlayer())
        setPlayer(guest)
        writeCurrentPlayer(guest)
      }
    } catch {
      setStorageWarning(true)
    }
  }, [])

  const selectPlayer = useCallback((username = GUEST_NAME) => {
    const nextPlayer = refreshDailyEngagement(readPlayer(username))
    setPlayer(nextPlayer)
    setSyncStatus('local')
    try {
      writeCurrentPlayer(nextPlayer)
    } catch {
      setStorageWarning(true)
    }
  }, [])

  const connectAccount = useCallback(async (email) => {
    const normalizedEmail = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error('Enter a valid email address.')
    }
    const localPlayer = refreshDailyEngagement(normalizePlayer(
      player || createPlayer(),
      player?.username || normalizedEmail.split('@')[0],
      normalizedEmail,
    ))
    setSyncStatus('syncing')
    setSyncError('')
    const synced = await syncAccount(normalizedEmail, localPlayer)
    setPlayer(synced)
    setSyncStatus('synced')
    try {
      writeCurrentPlayer(synced)
    } catch {
      setStorageWarning(true)
    }
    return synced
  }, [player])

  const persistPlayer = useCallback((next) => {
    try {
      writeCurrentPlayer(next)
    } catch {
      setStorageWarning(true)
    }
    if (next.accountEmail) {
      setSyncStatus('syncing')
      syncAccount(next.accountEmail, next)
        .then((synced) => {
          setPlayer(synced)
          setSyncStatus('synced')
          writeCurrentPlayer(synced)
        })
        .catch((error) => {
          setSyncStatus('error')
          setSyncError(error.message)
        })
    }
  }, [])

  const saveProgress = useCallback((gameKey, {
    score,
    levelReached,
    xpEarned,
    mode,
    completionTime,
    difficulty,
    timerMode,
    activePack,
  }) => {
    setPlayer((current) => {
      if (!current) return current
      const next = applyProgressUpdate(current, gameKey, {
        score,
        levelReached,
        xpEarned,
        mode,
        completionTime,
        difficulty,
        timerMode,
        activePack,
      })
      persistPlayer(next)
      return next
    })
  }, [persistPlayer])

  const selectGameMode = useCallback((gameKey, mode) => {
    if (gameKey !== 'boggle' || !BOGGLE_MODES.includes(Number(mode))) return
    setPlayer((current) => {
      if (!current) return current
      const currentGame = current.games[gameKey] || createGameProgress({}, gameKey)
      const next = {
        ...current,
        games: {
          ...current.games,
          [gameKey]: {
            ...currentGame,
            selectedMode: Number(mode),
          },
        },
      }
      try {
        writeCurrentPlayer(next)
      } catch {
        setStorageWarning(true)
      }
      if (next.accountEmail) {
        setSyncStatus('syncing')
        syncAccount(next.accountEmail, next)
          .then((synced) => {
            setPlayer(synced)
            setSyncStatus('synced')
            writeCurrentPlayer(synced)
          })
          .catch((error) => {
            setSyncStatus('error')
            setSyncError(error.message)
          })
      }
      return next
    })
  }, [])

  const updateGamePreference = useCallback((gameKey, patch, mode = null) => {
    setPlayer((current) => {
      if (!current) return current
      const currentGame = current.games[gameKey] || createGameProgress({}, gameKey)
      const trackMode = gameKey === 'boggle' && BOGGLE_MODES.includes(Number(mode || currentGame.selectedMode))
        ? Number(mode || currentGame.selectedMode)
        : null
      const nextGame = trackMode
        ? {
            ...currentGame,
            selectedMode: trackMode,
            modes: {
              ...currentGame.modes,
              [trackMode]: {
                ...currentGame.modes[trackMode],
                ...patch,
              },
            },
          }
        : {
            ...currentGame,
            ...patch,
          }
      const next = {
        ...current,
        games: {
          ...current.games,
          [gameKey]: nextGame,
        },
      }
      persistPlayer(next)
      return next
    })
  }, [persistPlayer])

  const selectDifficulty = useCallback((gameKey, difficulty, mode = null) => {
    if (!DIFFICULTIES.includes(difficulty)) return
    updateGamePreference(gameKey, { difficulty }, mode)
  }, [updateGamePreference])

  const selectTimerMode = useCallback((gameKey, timerMode, mode = null) => {
    updateGamePreference(gameKey, { timerMode: timerMode !== false }, mode)
  }, [updateGamePreference])

  const selectWordPack = useCallback((gameKey, activePack = 'default', mode = null) => {
    updateGamePreference(gameKey, { activePack }, mode)
  }, [updateGamePreference])

  const spendCoins = useCallback((amount) => {
    const cost = Math.max(0, Number(amount) || 0)
    if (!player || player.coins < cost) return false
    const next = { ...player, coins: player.coins - cost }
    setPlayer(next)
    persistPlayer(next)
    return true
  }, [persistPlayer, player])

  const unlockWordPack = useCallback((packId, cost) => {
    if (!player || player.unlockedPacks.includes(packId) || player.coins < cost) return false
    const next = {
      ...player,
      coins: player.coins - cost,
      unlockedPacks: [...player.unlockedPacks, packId],
    }
    setPlayer(next)
    persistPlayer(next)
    return true
  }, [persistPlayer, player])

  const switchPlayer = useCallback(() => {
    setPlayer(null)
    try {
      localStorage.removeItem('wordmaster_current_user')
    } catch {
      setStorageWarning(true)
    }
    setSyncStatus('local')
    setSyncError('')
  }, [])

  const getLeaderboard = useCallback(() => {
    try {
      return buildLeaderboard(readStoredPlayers(), player)
    } catch {
      setStorageWarning(true)
      return buildLeaderboard(player ? [player] : [], player)
    }
  }, [player])

  return {
    player,
    selectPlayer,
    saveProgress,
    selectGameMode,
    selectDifficulty,
    selectTimerMode,
    selectWordPack,
    spendCoins,
    unlockWordPack,
    connectAccount,
    switchPlayer,
    getLeaderboard,
    syncStatus,
    syncError,
    storageWarning,
    clearStorageWarning: () => setStorageWarning(false),
  }
}
