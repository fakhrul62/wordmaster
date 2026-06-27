import { MongoClient } from 'mongodb'

let clientPromise
let cache = { key: '', expiresAt: 0, payload: null }

function getClient() {
  if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI')
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI)
    clientPromise = client.connect()
  }
  return clientPromise
}

function publicPlayer(player, rank) {
  const totalXP = Math.max(0, Number(player.totalXP) || 0)
  const totalPoints = Math.max(0, Number(player.totalPoints) || 0)
  const coins = Math.max(0, Number(player.coins) || 0)
  return {
    username: player.username || 'Player',
    activeTitle: player.activeTitle || 'Beginner Explorer',
    totalXP,
    totalPoints,
    coins,
    leaderboardScore: totalPoints + totalXP + coins * 2,
    rank,
  }
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const around = String(request.query?.around || '').trim().toLowerCase()
    const limit = Math.min(100, Math.max(1, Number(request.query?.limit) || (around ? 10 : 50)))
    const cacheKey = `${around || 'top'}:${limit}`
    if (cache.key === cacheKey && cache.expiresAt > Date.now()) {
      response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
      return response.status(200).json(cache.payload)
    }

    const client = await getClient()
    const db = client.db(process.env.MONGODB_DB || 'wordmaster')
    const players = db.collection('players')
    await players.createIndex({ leaderboardScore: -1 })

    const docs = await players
      .find({}, { projection: { _id: 0, email: 1, username: 1, activeTitle: 1, totalXP: 1, totalPoints: 1, coins: 1 } })
      .toArray()

    const sortedDocs = docs
      .map((doc) => ({
        ...doc,
        leaderboardScore: (doc.totalPoints || 0) + (doc.totalXP || 0) + (doc.coins || 0) * 2,
      }))
      .sort((a, b) => b.leaderboardScore - a.leaderboardScore)

    const ranked = sortedDocs
      .map((doc, index) => publicPlayer(doc, index + 1))

    let entries = ranked.slice(0, limit)
    let playerRank = null
    if (around) {
      const aroundIndex = sortedDocs.findIndex((doc) =>
        String(doc.email || doc.accountEmail || '').toLowerCase() === around)
      const start = Math.max(0, aroundIndex - 5)
      entries = aroundIndex >= 0 ? ranked.slice(start, start + limit) : entries
      playerRank = aroundIndex >= 0 ? aroundIndex + 1 : null
    }

    const payload = {
      entries,
      playerRank,
      totalPlayers: ranked.length,
      updatedAt: new Date().toISOString(),
    }
    cache = { key: cacheKey, expiresAt: Date.now() + 5 * 60 * 1000, payload }
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return response.status(200).json(payload)
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Leaderboard unavailable.' })
  }
}
