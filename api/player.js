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
          clears: Math.max(0, Number(existing.clears) || 0),
          completedLevels: Array.isArray(existing.completedLevels) ? existing.completedLevels : [],
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
  const totalXP = Math.max(0, Number(player?.totalXP) || 0)
  const titles = Array.isArray(player?.titles) && player.titles.length ? player.titles : ['Beginner Explorer']
  return {
    username: String(player?.username || email.split('@')[0] || 'Player').trim().slice(0, 32),
    email,
    accountEmail: email,
    isGuest: false,
    totalXP,
    totalPoints: Math.max(0, Number(player?.totalPoints) || totalXP),
    coins: Math.max(0, Number(player?.coins) || 0),
    gamesPlayed: Math.max(0, Number(player?.gamesPlayed) || 0),
    dailyChallengesCompleted: Math.max(0, Number(player?.dailyChallengesCompleted) || 0),
    eventMissionsCompleted: Math.max(0, Number(player?.eventMissionsCompleted) || 0),
    achievements: Array.isArray(player?.achievements) ? player.achievements : [],
    titles,
    activeTitle: player?.activeTitle || titles.at(-1),
    recentUnlocks: Array.isArray(player?.recentUnlocks) ? player.recentUnlocks.slice(0, 8) : [],
    daily: player?.daily || null,
    events: player?.events && typeof player.events === 'object' ? player.events : {},
    streak: {
      count: Math.max(0, Number(player?.streak?.count) || 0),
      best: Math.max(0, Number(player?.streak?.best) || Number(player?.streak?.count) || 0),
      lastLogin: player?.streak?.lastLogin || player?.lastLogin || '',
      reward: player?.streak?.reward || { coins: 0, xp: 0, points: 0 },
    },
    lastLogin: player?.lastLogin || player?.streak?.lastLogin || '',
    lastPlayed: player?.lastPlayed || new Date().toISOString().slice(0, 10),
    games,
  }
}

function newestDaily(localDaily, remoteDaily) {
  if (!localDaily?.date) return remoteDaily || null
  if (!remoteDaily?.date) return localDaily
  return localDaily.date >= remoteDaily.date ? localDaily : remoteDaily
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
      clears: Math.max(local.games[key].clears, remote.games[key].clears),
      completedLevels: [...new Set([
        ...local.games[key].completedLevels,
        ...remote.games[key].completedLevels,
      ])].sort((a, b) => a - b),
    }
  })

  return {
    ...remote,
    username: local.username || remote.username,
    email,
    accountEmail: email,
    totalXP: Math.max(local.totalXP, remote.totalXP),
    totalPoints: Math.max(local.totalPoints, remote.totalPoints),
    coins: Math.max(local.coins, remote.coins),
    gamesPlayed: Math.max(local.gamesPlayed, remote.gamesPlayed),
    dailyChallengesCompleted: Math.max(local.dailyChallengesCompleted, remote.dailyChallengesCompleted),
    eventMissionsCompleted: Math.max(local.eventMissionsCompleted, remote.eventMissionsCompleted),
    achievements: [...new Set([...local.achievements, ...remote.achievements])],
    titles: [...new Set([...local.titles, ...remote.titles])],
    activeTitle: local.totalXP >= remote.totalXP ? local.activeTitle : remote.activeTitle,
    recentUnlocks: [...local.recentUnlocks, ...remote.recentUnlocks].slice(0, 8),
    daily: newestDaily(local.daily, remote.daily),
    events: { ...remote.events, ...local.events },
    streak: local.streak.best >= remote.streak.best ? local.streak : remote.streak,
    lastLogin: local.lastLogin > remote.lastLogin ? local.lastLogin : remote.lastLogin,
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
