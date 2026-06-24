import { useCallback, useEffect, useState } from 'react'
import { normalizeUsername } from '../utils/wordUtils'

const GAME_KEYS = ['wordchain', 'anagramvault', 'crossclue', 'wordshrink', 'letterlock', 'wordle', 'boggle']
const GUEST_NAME = 'Guest'

const createGames = (existingGames = {}) =>
  Object.fromEntries(
    GAME_KEYS.map((key) => [key, { level: 1, highScore: 0, xp: 0, ...existingGames[key] }]),
  )

function createPlayer(username = GUEST_NAME, accountEmail = '') {
  return {
    username: username.trim() || GUEST_NAME,
    accountEmail,
    isGuest: !accountEmail,
    totalXP: 0,
    gamesPlayed: 0,
    lastPlayed: new Date().toISOString().slice(0, 10),
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
  return {
    ...createPlayer(fallbackUsername, accountEmail),
    ...player,
    username: String(player?.username || fallbackUsername || GUEST_NAME).trim(),
    accountEmail: normalizeEmail(player?.accountEmail || accountEmail),
    isGuest: !normalizeEmail(player?.accountEmail || accountEmail),
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
  return normalizePlayer(payload.player, email.split('@')[0], email)
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
        setPlayer(storedPlayer)
        setSyncStatus(storedPlayer.accountEmail ? 'syncing' : 'local')
        if (storedPlayer.accountEmail) {
          syncAccount(storedPlayer.accountEmail, storedPlayer)
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
        const guest = createPlayer()
        setPlayer(guest)
        writeCurrentPlayer(guest)
      }
    } catch {
      setStorageWarning(true)
    }
  }, [])

  const selectPlayer = useCallback((username = GUEST_NAME) => {
    const nextPlayer = readPlayer(username)
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
    const localPlayer = normalizePlayer(player || createPlayer(), player?.username || normalizedEmail.split('@')[0], normalizedEmail)
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

  const saveProgress = useCallback((gameKey, { score, levelReached, xpEarned }) => {
    setPlayer((current) => {
      if (!current) return current
      const currentGame = current.games[gameKey] || { level: 1, highScore: 0, xp: 0 }
      const next = {
        ...current,
        totalXP: current.totalXP + xpEarned,
        gamesPlayed: current.gamesPlayed + 1,
        lastPlayed: new Date().toISOString().slice(0, 10),
        games: {
          ...current.games,
          [gameKey]: {
            level: Math.max(currentGame.level, levelReached),
            highScore: Math.max(currentGame.highScore, score),
            xp: currentGame.xp + xpEarned,
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
      return Object.keys(localStorage)
        .filter((key) => key.startsWith('wordmaster_player_'))
        .map((key) => JSON.parse(localStorage.getItem(key)))
        .concat(
          Object.keys(localStorage)
            .filter((key) => key.startsWith('wordmaster_account_'))
            .map((key) => JSON.parse(localStorage.getItem(key))),
        )
        .filter(Boolean)
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 10)
    } catch {
      setStorageWarning(true)
      return player ? [player] : []
    }
  }, [player])

  return {
    player,
    selectPlayer,
    saveProgress,
    connectAccount,
    switchPlayer,
    getLeaderboard,
    syncStatus,
    syncError,
    storageWarning,
    clearStorageWarning: () => setStorageWarning(false),
  }
}
