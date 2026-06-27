import wordData from '../data/words.json'
import { WORD_PACKS } from '../data/wordPacks'
import englishWords from 'an-array-of-english-words'

export const ALL_WORDS = wordData.words
const BLOCKED_WORDS = new Set([
  'aaa',
  'aaaa',
  'aaaaa',
  'mon',
  'zzz',
])

export const isPlayableDictionaryWord = (word = '') => {
  const normalized = word.toLowerCase()
  return /^[a-z]{3,15}$/.test(normalized) &&
    !/^(.)\1+$/.test(normalized) &&
    !BLOCKED_WORDS.has(normalized)
}

export const VALID_WORDS = englishWords.filter(isPlayableDictionaryWord)
export const WORD_SET = new Set(VALID_WORDS)
const WORD_MAP = Object.fromEntries(ALL_WORDS.map((entry) => [entry.word, entry]))

export const isValidWord = (word = '') => WORD_SET.has(word.toLowerCase())
export const getWordData = (word = '') => WORD_MAP[word.toLowerCase()] || null
export const getWordsByLength = (length) => ALL_WORDS.filter((word) => word.length === length)
export const getWordsByCategory = (category) => ALL_WORDS.filter((word) => word.category === category)
export const getWordsByCategoryAndLength = (category, length) =>
  ALL_WORDS.filter((word) => word.category === category && word.length === length)
export const getWordleAnswerCandidates = (length) => {
  const preferredCategory = length <= 5 ? 'common' : 'medium'
  const preferred = getWordsByCategoryAndLength(preferredCategory, length)
  const fallback = ALL_WORDS.filter((entry) => entry.length === length)
  return (preferred.length ? preferred : fallback)
    .map(({ word }) => word)
    .filter(isPlayableDictionaryWord)
}
export function getWordsForPack(packId = 'default', baseWords = ALL_WORDS) {
  const pack = WORD_PACKS.find((item) => item.id === packId)
  if (!pack || packId === 'default') return baseWords
  const packedEntries = pack.words.map((word) => ({
    word,
    length: word.length,
    category: 'pack',
    clue: '',
    definition: '',
    anagrams: [],
    shrinkChain: [],
  }))
  const seen = new Set()
  return [...baseWords, ...packedEntries].filter((entry) => {
    const key = typeof entry === 'string' ? entry : entry.word
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
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
  VALID_WORDS.filter((word) =>
    word.length >= 3 &&
    word.length <= source.length &&
    (!centerLetter || word.includes(centerLetter)) &&
    canBuildWord(word, source))

const getCuratedSubWords = (source) =>
  ALL_WORDS.filter(({ word }) =>
    word.length >= 3 &&
    word.length <= source.length &&
    canBuildWord(word, source))

export const getLetterLockSets = () =>
  ALL_WORDS.filter((word) => word.length === 7 && getCuratedSubWords(word.word).length >= 8)

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
  if (xp >= 4200) return 'Grand Master'
  if (xp >= 2600) return 'Legend'
  if (xp >= 1500) return 'Champion'
  if (xp >= 800) return 'Speed Runner'
  if (xp >= 350) return 'Puzzle Master'
  return 'Beginner Explorer'
}

export const normalizeUsername = (username) =>
  username.trim().toLowerCase().replace(/\s+/g, '_')
