import { GAME_CATALOG, GAME_KEYS, getGameMeta } from '../data/gameCatalog'

const DAY_MS = 24 * 60 * 60 * 1000
const PLAYER_LEVEL_XP = 140
const MAX_VISIBLE_LEVELS = 12
export const BOGGLE_MODES = [3, 4, 5, 6]

const TITLE_TIERS = [
  { id: 'beginner_explorer', title: 'Beginner Explorer', xp: 0 },
  { id: 'puzzle_master', title: 'Puzzle Master', xp: 350 },
  { id: 'speed_runner', title: 'Speed Runner', xp: 800 },
  { id: 'champion', title: 'Champion', xp: 1500 },
  { id: 'legend', title: 'Legend', xp: 2600 },
  { id: 'grand_master', title: 'Grand Master', xp: 4200 },
]

export const ACHIEVEMENTS = [
  {
    id: 'first_clear',
    title: 'First Clear',
    description: 'Complete any level.',
    rewardTitle: 'Beginner Explorer',
    isUnlocked: (player) => player.gamesPlayed >= 1,
  },
  {
    id: 'daily_regular',
    title: 'Daily Regular',
    description: 'Reach a 3 day login streak.',
    rewardTitle: 'Puzzle Master',
    isUnlocked: (player) => player.streak.count >= 3,
  },
  {
    id: 'streak_keeper',
    title: 'Streak Keeper',
    description: 'Reach a 7 day login streak.',
    rewardTitle: 'Champion',
    isUnlocked: (player) => player.streak.count >= 7,
  },
  {
    id: 'coin_collector',
    title: 'Coin Collector',
    description: 'Collect 500 coins.',
    rewardTitle: 'Puzzle Master',
    isUnlocked: (player) => player.coins >= 500,
  },
  {
    id: 'high_scorer',
    title: 'High Scorer',
    description: 'Earn 1,000 total points.',
    rewardTitle: 'Speed Runner',
    isUnlocked: (player) => player.totalPoints >= 1000,
  },
  {
    id: 'mode_master',
    title: 'Mode Master',
    description: 'Reach level 5 in every mini-game.',
    rewardTitle: 'Legend',
    isUnlocked: (player) => GAME_KEYS.every((key) => player.games[key]?.level >= 5),
  },
  {
    id: 'wordle_climber',
    title: 'Wordle Climber',
    description: 'Reach Wordle level 10.',
    rewardTitle: 'Speed Runner',
    isUnlocked: (player) => player.games.wordle?.level >= 10,
  },
  {
    id: 'event_finisher',
    title: 'Event Finisher',
    description: 'Complete a special event mission.',
    rewardTitle: 'Champion',
    isUnlocked: (player) => player.eventMissionsCompleted >= 1,
  },
  {
    id: 'daily_sweeper',
    title: 'Daily Sweeper',
    description: 'Complete 10 daily challenges.',
    rewardTitle: 'Legend',
    isUnlocked: (player) => player.dailyChallengesCompleted >= 10,
  },
  {
    id: 'grand_master',
    title: 'Grand Master',
    description: 'Reach overall level 30.',
    rewardTitle: 'Grand Master',
    isUnlocked: (player) => getPlayerLevel(player.totalXP).level >= 30,
  },
]

const EVENT_THEMES = [
  {
    name: 'Neon Lexicon Cup',
    currency: 'Neon Shards',
    badge: 'Neon Challenger',
    accent: 'cyan',
  },
  {
    name: 'Vaultbreaker Week',
    currency: 'Cipher Coins',
    badge: 'Vaultbreaker',
    accent: 'pink',
  },
  {
    name: 'Wordsmith Rally',
    currency: 'Rally Tokens',
    badge: 'Rally Finisher',
    accent: 'gold',
  },
  {
    name: 'Letterlock Festival',
    currency: 'Festival Keys',
    badge: 'Festival Solver',
    accent: 'green',
  },
]

const RIVAL_NAMES = [
  'NovaLex',
  'CluePilot',
  'VaultAce',
  'RapidRoot',
  'GlyphRush',
  'WordNinja',
  'GridQueen',
  'LexRider',
]

export function todayKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function parseDay(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function daysBetween(start, end) {
  const startDate = parseDay(start)
  const endDate = parseDay(end)
  if (!startDate || !endDate) return 999
  return Math.round((endDate - startDate) / DAY_MS)
}

function hashSeed(value) {
  return String(value).split('').reduce((hash, char) => {
    const nextHash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
    return Math.abs(nextHash)
  }, 17)
}

function seededIndex(seed, length, offset = 0) {
  return (seed + offset * 37) % length
}

function createModeProgress(existing = {}) {
  return {
    level: Math.max(1, Number(existing.level) || 1),
    highScore: Math.max(0, Number(existing.highScore) || 0),
    xp: Math.max(0, Number(existing.xp) || 0),
    clears: Math.max(0, Number(existing.clears) || 0),
    completedLevels: Array.isArray(existing.completedLevels) ? existing.completedLevels : [],
  }
}

export function createGameProgress(existing = {}, gameKey = '') {
  const base = createModeProgress(existing)
  if (gameKey !== 'boggle') return base
  const selectedMode = BOGGLE_MODES.includes(Number(existing.selectedMode)) ? Number(existing.selectedMode) : null
  const migrationMode = selectedMode || 3
  return {
    ...base,
    selectedMode,
    modes: Object.fromEntries(BOGGLE_MODES.map((mode) => [
      mode,
      createModeProgress(existing.modes?.[mode] || (mode === migrationMode ? existing : {})),
    ])),
  }
}

export const createGames = (existingGames = {}) =>
  Object.fromEntries(GAME_KEYS.map((key) => [key, createGameProgress(existingGames[key], key)]))

export function getGameTrack(gameProgress, gameKey, mode = null) {
  if (gameKey === 'boggle' && mode) {
    return gameProgress?.modes?.[mode] || createModeProgress()
  }
  return gameProgress || createModeProgress()
}

export function getPlayerLevel(totalXP = 0) {
  const level = Math.floor(totalXP / PLAYER_LEVEL_XP) + 1
  const currentXP = totalXP % PLAYER_LEVEL_XP
  return {
    level,
    currentXP,
    nextXP: PLAYER_LEVEL_XP,
    progress: Math.min(100, Math.round((currentXP / PLAYER_LEVEL_XP) * 100)),
  }
}

export function getTitleForXP(totalXP = 0) {
  return TITLE_TIERS.reduce((current, tier) => (totalXP >= tier.xp ? tier : current), TITLE_TIERS[0]).title
}

function streakReward(count) {
  const milestoneBonus = count > 0 && count % 7 === 0 ? 90 : count > 0 && count % 3 === 0 ? 35 : 0
  return {
    coins: 25 + Math.min(75, count * 5) + milestoneBonus,
    xp: 15 + Math.min(60, count * 3),
    points: 40 + Math.min(160, count * 10),
  }
}

export function generateDailyChallenges(username = 'player', date = todayKey()) {
  const seed = hashSeed(`${username}-${date}`)
  const selectedGames = [0, 1, 2].map((offset) => GAME_CATALOG[seededIndex(seed, GAME_CATALOG.length, offset)])
  return selectedGames.map((game, index) => {
    const scoreTarget = 120 + ((seededIndex(seed, 6, index) + index) * 35)
    const type = index === 1 ? 'score' : index === 2 ? 'play' : 'clear'
    const reward = {
      coins: 45 + index * 15,
      xp: 25 + index * 10,
      points: 90 + index * 35,
    }
    const label = type === 'score'
      ? `Score ${scoreTarget}+ in ${game.shortName}`
      : type === 'play'
        ? `Play ${game.shortName}`
        : `Clear a ${game.shortName} level`
    return {
      id: `${date}-${game.key}-${type}-${index}`,
      gameKey: game.key,
      type,
      targetScore: scoreTarget,
      title: label,
      description: `${game.name}: ${type === 'score' ? 'hit the target score' : type === 'play' ? 'finish a run' : 'complete any unlocked level'}.`,
      reward,
      completed: false,
      completedAt: '',
    }
  })
}

export function getActiveEvent(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const half = date.getDate() <= 15 ? 1 : 2
  const theme = EVENT_THEMES[(month + half - 1) % EVENT_THEMES.length]
  const startDay = half === 1 ? 1 : 16
  const endDay = half === 1 ? 15 : new Date(year, month + 1, 0).getDate()
  const startDate = todayKey(new Date(year, month, startDay))
  const endDate = todayKey(new Date(year, month, endDay))
  return {
    id: `${year}-${String(month + 1).padStart(2, '0')}-${half}`,
    ...theme,
    startsAt: startDate,
    endsAt: endDate,
    missions: [
      {
        id: 'event-points',
        title: 'Score Sprint',
        description: 'Earn 900 points during the event.',
        type: 'points',
        target: 900,
        reward: { coins: 120, xp: 80, eventCurrency: 35 },
      },
      {
        id: 'event-clears',
        title: 'Level Surge',
        description: 'Clear 4 levels during the event.',
        type: 'clears',
        target: 4,
        reward: { coins: 160, xp: 100, eventCurrency: 50 },
      },
      {
        id: 'event-variety',
        title: 'Mode Tour',
        description: 'Complete runs in 3 different mini-games.',
        type: 'uniqueGames',
        target: 3,
        reward: { coins: 200, xp: 120, eventCurrency: 65 },
      },
    ],
  }
}

function ensureDailyState(player, date = todayKey()) {
  if (player.daily?.date === date && Array.isArray(player.daily.challenges)) return player.daily
  return {
    date,
    challenges: generateDailyChallenges(player.username, date),
  }
}

function applyAchievementUnlocks(player) {
  const owned = new Set(player.achievements)
  const titles = new Set(player.titles)
  const recentUnlocks = [...player.recentUnlocks]
  ACHIEVEMENTS.forEach((achievement) => {
    if (owned.has(achievement.id) || !achievement.isUnlocked(player)) return
    owned.add(achievement.id)
    titles.add(achievement.rewardTitle)
    recentUnlocks.unshift({
      id: achievement.id,
      type: 'achievement',
      title: achievement.title,
      detail: `Title unlocked: ${achievement.rewardTitle}`,
      date: todayKey(),
    })
  })
  return {
    ...player,
    achievements: [...owned],
    titles: [...titles],
    activeTitle: [...titles].at(-1) || getTitleForXP(player.totalXP),
    recentUnlocks: recentUnlocks.slice(0, 8),
  }
}

export function refreshDailyEngagement(player, now = new Date()) {
  const date = todayKey(now)
  const lastLogin = player.streak?.lastLogin || player.lastLogin || ''
  if (lastLogin === date) {
    return applyAchievementUnlocks({ ...player, daily: ensureDailyState(player, date) })
  }
  const gap = daysBetween(lastLogin, date)
  const count = gap === 1 ? (player.streak?.count || 0) + 1 : 1
  const reward = streakReward(count)
  const nextPlayer = {
    ...player,
    coins: player.coins + reward.coins,
    totalXP: player.totalXP + reward.xp,
    totalPoints: player.totalPoints + reward.points,
    lastLogin: date,
    streak: {
      count,
      lastLogin: date,
      best: Math.max(player.streak?.best || 0, count),
      reward,
    },
    daily: ensureDailyState(player, date),
    recentUnlocks: [
      {
        id: `streak-${date}`,
        type: 'streak',
        title: `${count} day streak`,
        detail: `+${reward.coins} coins, +${reward.xp} XP`,
        date,
      },
      ...player.recentUnlocks,
    ].slice(0, 8),
  }
  return applyAchievementUnlocks(nextPlayer)
}

function updateDailyChallenges(player, gameKey, score, didClear) {
  const daily = ensureDailyState(player)
  let bonus = { coins: 0, xp: 0, points: 0 }
  const challenges = daily.challenges.map((challenge) => {
    if (challenge.completed || challenge.gameKey !== gameKey) return challenge
    const completed =
      (challenge.type === 'clear' && didClear) ||
      (challenge.type === 'score' && score >= challenge.targetScore) ||
      challenge.type === 'play'
    if (!completed) return challenge
    bonus = {
      coins: bonus.coins + challenge.reward.coins,
      xp: bonus.xp + challenge.reward.xp,
      points: bonus.points + challenge.reward.points,
    }
    return { ...challenge, completed: true, completedAt: todayKey() }
  })
  const completedNow = challenges.filter((challenge, index) =>
    challenge.completed && !daily.challenges[index].completed).length
  return {
    daily: { ...daily, challenges },
    bonus,
    completedNow,
  }
}

function updateEvent(player, gameKey, score, didClear) {
  const activeEvent = getActiveEvent()
  const stored = player.events[activeEvent.id] || {}
  const current = {
    points: 0,
    clears: 0,
    games: {},
    completedMissions: [],
    eventCurrency: 0,
    ...stored,
  }
  const nextState = {
    ...current,
    points: current.points + score,
    clears: current.clears + (didClear ? 1 : 0),
    games: {
      ...current.games,
      [gameKey]: (current.games[gameKey] || 0) + 1,
    },
    completedMissions: [...current.completedMissions],
  }
  let bonus = { coins: 0, xp: 0, points: 0, eventCurrency: 0 }
  let completedNow = 0
  activeEvent.missions.forEach((mission) => {
    if (nextState.completedMissions.includes(mission.id)) return
    const progress = mission.type === 'points'
      ? nextState.points
      : mission.type === 'clears'
        ? nextState.clears
        : Object.keys(nextState.games).length
    if (progress < mission.target) return
    nextState.completedMissions.push(mission.id)
    nextState.eventCurrency += mission.reward.eventCurrency
    bonus = {
      coins: bonus.coins + mission.reward.coins,
      xp: bonus.xp + mission.reward.xp,
      points: bonus.points + mission.reward.eventCurrency,
      eventCurrency: bonus.eventCurrency + mission.reward.eventCurrency,
    }
    completedNow += 1
  })
  return {
    events: {
      ...player.events,
      [activeEvent.id]: nextState,
    },
    bonus,
    completedNow,
  }
}

export function applyProgressUpdate(current, gameKey, { score = 0, levelReached = 1, xpEarned = 0, mode = null }) {
  const trackMode = gameKey === 'boggle' && BOGGLE_MODES.includes(Number(mode)) ? Number(mode) : null
  const currentGame = current.games[gameKey] || createGameProgress({}, gameKey)
  const currentTrack = getGameTrack(currentGame, gameKey, trackMode)
  const didClear = levelReached > currentTrack.level || score > 0
  const completedLevel = Math.max(1, levelReached - 1)
  const completedLevels = [...new Set([...currentTrack.completedLevels, completedLevel])].sort((a, b) => a - b)
  const nextTrack = {
    ...currentTrack,
    level: Math.max(currentTrack.level, levelReached),
    highScore: Math.max(currentTrack.highScore, score),
    xp: currentTrack.xp + xpEarned,
    clears: currentTrack.clears + (didClear ? 1 : 0),
    completedLevels,
  }
  const nextGame = gameKey === 'boggle' && trackMode
    ? {
        ...currentGame,
        selectedMode: trackMode,
        modes: {
          ...currentGame.modes,
          [trackMode]: nextTrack,
        },
        level: Math.max(...BOGGLE_MODES.map((item) =>
          item === trackMode ? nextTrack.level : getGameTrack(currentGame, gameKey, item).level)),
        highScore: Math.max(currentGame.highScore || 0, score),
        xp: (currentGame.xp || 0) + xpEarned,
        clears: (currentGame.clears || 0) + (didClear ? 1 : 0),
      }
    : nextTrack
  let nextPlayer = {
    ...current,
    totalXP: current.totalXP + xpEarned,
    totalPoints: current.totalPoints + score,
    gamesPlayed: current.gamesPlayed + 1,
    lastPlayed: todayKey(),
    games: {
      ...current.games,
      [gameKey]: nextGame,
    },
  }

  const dailyUpdate = updateDailyChallenges(nextPlayer, gameKey, score, didClear)
  const eventUpdate = updateEvent(nextPlayer, gameKey, score, didClear)
  const totalBonus = {
    coins: dailyUpdate.bonus.coins + eventUpdate.bonus.coins,
    xp: dailyUpdate.bonus.xp + eventUpdate.bonus.xp,
    points: dailyUpdate.bonus.points + eventUpdate.bonus.points,
  }
  const unlocks = []
  if (dailyUpdate.completedNow) {
    unlocks.push({
      id: `daily-${todayKey()}-${Date.now()}`,
      type: 'daily',
      title: `${dailyUpdate.completedNow} daily challenge${dailyUpdate.completedNow > 1 ? 's' : ''}`,
      detail: `+${dailyUpdate.bonus.coins} coins, +${dailyUpdate.bonus.xp} XP`,
      date: todayKey(),
    })
  }
  if (eventUpdate.completedNow) {
    unlocks.push({
      id: `event-${getActiveEvent().id}-${Date.now()}`,
      type: 'event',
      title: `${getActiveEvent().name} mission`,
      detail: `+${eventUpdate.bonus.eventCurrency} ${getActiveEvent().currency}`,
      date: todayKey(),
    })
  }

  nextPlayer = {
    ...nextPlayer,
    coins: nextPlayer.coins + totalBonus.coins,
    totalXP: nextPlayer.totalXP + totalBonus.xp,
    totalPoints: nextPlayer.totalPoints + totalBonus.points,
    dailyChallengesCompleted: nextPlayer.dailyChallengesCompleted + dailyUpdate.completedNow,
    eventMissionsCompleted: nextPlayer.eventMissionsCompleted + eventUpdate.completedNow,
    daily: dailyUpdate.daily,
    events: eventUpdate.events,
    recentUnlocks: [...unlocks, ...nextPlayer.recentUnlocks].slice(0, 8),
  }

  return applyAchievementUnlocks(nextPlayer)
}

export function getLevelMap(unlockedLevel = 1) {
  const start = Math.max(1, Math.min(unlockedLevel - 3, Math.max(1, unlockedLevel - 6)))
  const levels = Array.from({ length: MAX_VISIBLE_LEVELS }, (_, index) => start + index)
  if (!levels.includes(unlockedLevel + 1)) levels[levels.length - 1] = unlockedLevel + 1
  return levels.map((level) => ({
    level,
    unlocked: level <= unlockedLevel,
    current: level === unlockedLevel,
    next: level === unlockedLevel + 1,
  }))
}

export function getUpcomingMilestones(player) {
  const playerLevel = getPlayerLevel(player.totalXP)
  const nearestGame = GAME_CATALOG
    .map((game) => ({ game, level: getGameTrack(player.games[game.key], game.key, player.games[game.key]?.selectedMode).level }))
    .sort((a, b) => a.level - b.level)[0]
  const lockedAchievement = ACHIEVEMENTS.find((achievement) => !player.achievements.includes(achievement.id))
  return [
    {
      title: `Overall level ${playerLevel.level + 1}`,
      detail: `${playerLevel.nextXP - playerLevel.currentXP} XP to go`,
    },
    {
      title: `${nearestGame.game.name} level ${nearestGame.level + 1}`,
      detail: 'Clear the next level to advance this mode',
    },
    lockedAchievement && {
      title: lockedAchievement.title,
      detail: lockedAchievement.description,
    },
  ].filter(Boolean)
}

function leaderboardScore(player) {
  return (player.totalPoints || 0) + (player.totalXP || 0) + (player.coins || 0) * 2
}

function makeRivals(seed = 0) {
  return RIVAL_NAMES.map((username, index) => {
    const totalXP = 260 + index * 310 + seededIndex(seed, 150, index)
    const totalPoints = 900 + index * 650 + seededIndex(seed, 300, index + 2)
    return {
      username,
      activeTitle: getTitleForXP(totalXP),
      totalXP,
      totalPoints,
      coins: 80 + index * 35,
      isRival: true,
    }
  })
}

export function buildLeaderboard(localPlayers = [], currentPlayer = null) {
  const rivals = makeRivals(hashSeed(todayKey()))
  const merged = [...localPlayers, ...rivals]
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      activeTitle: entry.activeTitle || getTitleForXP(entry.totalXP),
      leaderboardScore: leaderboardScore(entry),
    }))
    .sort((a, b) => b.leaderboardScore - a.leaderboardScore)
  const currentKey = currentPlayer?.accountEmail || currentPlayer?.username
  const currentRank = merged.findIndex((entry) =>
    (entry.accountEmail || entry.username) === currentKey) + 1
  return {
    entries: merged.slice(0, 10),
    playerRank: currentRank || merged.length,
    totalPlayers: Math.max(merged.length, 1248 + seededIndex(hashSeed(todayKey()), 500)),
    friends: localPlayers.filter((entry) => entry.username !== currentPlayer?.username).slice(0, 5),
  }
}

export function getEventProgress(player) {
  const event = getActiveEvent()
  const state = player.events[event.id] || {
    points: 0,
    clears: 0,
    games: {},
    completedMissions: [],
    eventCurrency: 0,
  }
  const missions = event.missions.map((mission) => {
    const value = mission.type === 'points'
      ? state.points
      : mission.type === 'clears'
        ? state.clears
        : Object.keys(state.games).length
    return {
      ...mission,
      progress: Math.min(value, mission.target),
      completed: state.completedMissions.includes(mission.id),
    }
  })
  return { event, state, missions }
}

export function gameLabel(gameKey) {
  return getGameMeta(gameKey).name
}
