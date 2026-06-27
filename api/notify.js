import { MongoClient } from 'mongodb'
import webpush from 'web-push'

let clientPromise

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function getClient() {
  if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI')
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI)
    clientPromise = client.connect()
  }
  return clientPromise
}

function configureWebPush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    throw new Error('Missing VAPID keys')
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@wordmaster.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  )
}

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  try {
    configureWebPush()
    const client = await getClient()
    const db = client.db(process.env.MONGODB_DB || 'wordmaster')
    const players = db.collection('players')
    const today = todayKey()
    const payload = JSON.stringify({
      title: 'WordMaster',
      body: '🔥 Your daily challenge is ready! Keep your streak alive.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { url: '/?tab=daily' },
    })

    const recipients = await players.find({
      notificationsEnabled: true,
      pushSubscription: { $exists: true, $ne: null },
      lastPlayed: { $ne: today },
    }).toArray()

    let sent = 0
    let removed = 0
    await Promise.all(recipients.map(async (player) => {
      try {
        await webpush.sendNotification(player.pushSubscription, payload)
        sent += 1
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await players.updateOne({ email: player.email }, { $unset: { pushSubscription: '' } })
          removed += 1
        }
      }
    }))

    return response.status(200).json({ sent, removed })
  } catch (error) {
    return response.status(500).json({ error: error.message || 'Notification job failed.' })
  }
}
