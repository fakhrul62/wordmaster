import { MongoClient } from 'mongodb'

const GAME_KEYS = ['wordchain', 'anagramvault', 'crossclue', 'wordshrink', 'letterlock', 'wordle', 'boggle']

let clientPromise

function getClient() {
  if (!process.env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI')
  }
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI)
    clientPromise = client.connect()
  }
  return clientPromise
}

function createGames(existingGames = {}) {
  return Object.fromEntries(
    GAME_KEYS.map((key) => {
      const existing = existingGames[key] || {}
      return [
        key,
        {
          level: Math.max(1, Number(existing.level) || 1),
          highScore: Math.max(0, Number(existing.highScore) || 0),
          xp: Math.max(0, Number(existing.xp) || 0),
        },
      ]
    }),
  )
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function sanitizePlayer(player, email) {
  const games = createGames(player?.games)
  return {
    username: String(player?.username || email.split('@')[0] || 'Player').trim().slice(0, 32),
    email,
    accountEmail: email,
    isGuest: false,
    totalXP: Math.max(0, Number(player?.totalXP) || 0),
    gamesPlayed: Math.max(0, Number(player?.gamesPlayed) || 0),
    lastPlayed: player?.lastPlayed || new Date().toISOString().slice(0, 10),
    games,
  }
}

function mergePlayers(localPlayer, remotePlayer, email) {
  const local = sanitizePlayer(localPlayer, email)
  if (!remotePlayer) return local
  const remote = sanitizePlayer(remotePlayer, email)
  const games = createGames()

  GAME_KEYS.forEach((key) => {
    games[key] = {
      level: Math.max(local.games[key].level, remote.games[key].level),
      highScore: Math.max(local.games[key].highScore, remote.games[key].highScore),
      xp: Math.max(local.games[key].xp, remote.games[key].xp),
    }
  })

  return {
    ...remote,
    username: local.username || remote.username,
    email,
    accountEmail: email,
    totalXP: Math.max(local.totalXP, remote.totalXP),
    gamesPlayed: Math.max(local.gamesPlayed, remote.gamesPlayed),
    lastPlayed: local.lastPlayed > remote.lastPlayed ? local.lastPlayed : remote.lastPlayed,
    games,
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  const email = normalizeEmail(request.body?.email)
  if (!isEmail(email)) {
    return response.status(400).json({ error: 'A valid email is required.' })
  }

  try {
    const client = await getClient()
    const db = client.db(process.env.MONGODB_DB || 'wordmaster')
    const players = db.collection('players')
    await players.createIndex({ email: 1 }, { unique: true })

    const existing = await players.findOne({ email }, { projection: { _id: 0 } })
    const player = mergePlayers(request.body?.player, existing, email)
    const now = new Date()

    await players.updateOne(
      { email },
      { $set: { ...player, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    )

    return response.status(200).json({ player })
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Database sync failed.' })
  }
}
