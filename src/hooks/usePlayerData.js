import { useCallback, useState } from 'react'
import { normalizeUsername } from '../utils/wordUtils'

const GAME_KEYS = ['wordchain', 'anagramvault', 'crossclue', 'wordshrink', 'letterlock']

function createPlayer(username) {
  return {
    username: username.trim(),
    totalXP: 0,
    gamesPlayed: 0,
    lastPlayed: new Date().toISOString().slice(0, 10),
    games: Object.fromEntries(
      GAME_KEYS.map((key) => [key, { level: 1, highScore: 0, xp: 0 }]),
    ),
  }
}

const playerKey = (username) => `wordmaster_player_${normalizeUsername(username)}`

function readPlayer(username) {
  try {
    const stored = localStorage.getItem(playerKey(username))
    return stored ? JSON.parse(stored) : createPlayer(username)
  } catch {
    return createPlayer(username)
  }
}

export function usePlayerData() {
  const [player, setPlayer] = useState(null)
  const [storageWarning, setStorageWarning] = useState(false)

  const selectPlayer = useCallback((username) => {
    const nextPlayer = readPlayer(username)
    setPlayer(nextPlayer)
    try {
      localStorage.setItem('wordmaster_current_user', username.trim())
      localStorage.setItem(playerKey(username), JSON.stringify(nextPlayer))
    } catch {
      setStorageWarning(true)
    }
  }, [])

  const saveProgress = useCallback((gameKey, { score, levelReached, xpEarned }) => {
    setPlayer((current) => {
      if (!current) return current
      const currentGame = current.games[gameKey]
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
        localStorage.setItem(playerKey(current.username), JSON.stringify(next))
      } catch {
        setStorageWarning(true)
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
  }, [])

  const getLeaderboard = useCallback(() => {
    try {
      return Object.keys(localStorage)
        .filter((key) => key.startsWith('wordmaster_player_'))
        .map((key) => JSON.parse(localStorage.getItem(key)))
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
    switchPlayer,
    getLeaderboard,
    storageWarning,
    clearStorageWarning: () => setStorageWarning(false),
  }
}

