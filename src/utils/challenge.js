const CHALLENGE_PARAM = 'challenge'
const DEFAULT_ORIGIN = 'https://wordmaster-iota.vercel.app'

function encodePayload(payload) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

function decodePayload(value) {
  return JSON.parse(decodeURIComponent(escape(atob(value))))
}

export function encodeChallengeURL(gameKey, seed, date = new Date()) {
  const payload = {
    gameKey,
    seed,
    date: date.toISOString().slice(0, 10),
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : DEFAULT_ORIGIN
  return `${origin}/?${CHALLENGE_PARAM}=${encodeURIComponent(encodePayload(payload))}`
}

export function decodeChallengeURL(search = typeof window !== 'undefined' ? window.location.search : '') {
  try {
    const value = new URLSearchParams(search).get(CHALLENGE_PARAM)
    if (!value) return null
    const payload = decodePayload(value)
    if (!payload?.gameKey || payload.seed === undefined) return null
    return {
      gameKey: String(payload.gameKey),
      seed: payload.seed,
      date: payload.date || '',
    }
  } catch {
    return null
  }
}

export function makeChallengeSeed({ gameKey, level, mode, difficulty, activePack }) {
  return [gameKey, level, mode || 'default', difficulty || 'normal', activePack || 'default'].join(':')
}
