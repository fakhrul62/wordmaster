import wordData from '../data/words.json'

export const ALL_WORDS = wordData.words
export const CROSSCLUE_GRIDS = wordData.crossclueGrids
export const WORD_SET = new Set(ALL_WORDS.map(({ word }) => word))
const WORD_MAP = Object.fromEntries(ALL_WORDS.map((entry) => [entry.word, entry]))

export const isValidWord = (word = '') => WORD_SET.has(word.toLowerCase())
export const getWordData = (word = '') => WORD_MAP[word.toLowerCase()] || null
export const getWordsByLength = (length) => ALL_WORDS.filter((word) => word.length === length)
export const getWordsByCategory = (category) => ALL_WORDS.filter((word) => word.category === category)
export const getWordsByCategoryAndLength = (category, length) =>
  ALL_WORDS.filter((word) => word.category === category && word.length === length)
export const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)
export const getAnagramWords = (minimum = 1) =>
  ALL_WORDS.filter((word) => word.anagrams.length >= minimum)
export const getShrinkableWords = (startLength) =>
  ALL_WORDS.filter((word) => word.length === startLength && word.shrinkChain.length > 0)

function canBuildWord(candidate, source) {
  const pool = source.split('')
  return candidate.split('').every((letter) => {
    const index = pool.indexOf(letter)
    if (index === -1) return false
    pool.splice(index, 1)
    return true
  })
}

export const getSubWords = (source, centerLetter = '') =>
  ALL_WORDS.filter(({ word }) =>
    word.length >= 3 &&
    word.length <= source.length &&
    (!centerLetter || word.includes(centerLetter)) &&
    canBuildWord(word, source))

export const getLetterLockSets = () =>
  ALL_WORDS.filter((word) => word.length === 6 && getSubWords(word.word).length >= 8)

export function getDifficultyForLevel(level) {
  const cycle = Math.floor((level - 1) / 5) % 4
  const tier = ['easy', 'medium', 'hard', 'expert'][cycle]
  return level > 20 && (tier === 'easy' || tier === 'medium') ? 'hard' : tier
}

export function getCategoryForDifficulty(difficulty) {
  if (difficulty === 'easy') return 'common'
  if (difficulty === 'medium') return 'medium'
  return 'hard'
}

export const getXPForLevel = (level) => level * 10

export function getRank(xp) {
  if (xp >= 1500) return 'Grand Wordmaster'
  if (xp >= 700) return 'Sage'
  if (xp >= 300) return 'Lexicon'
  if (xp >= 100) return 'Wordsmith'
  return 'Apprentice'
}

export const normalizeUsername = (username) =>
  username.trim().toLowerCase().replace(/\s+/g, '_')

