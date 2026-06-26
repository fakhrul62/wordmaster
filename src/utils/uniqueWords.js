import { shuffle } from './wordUtils'

const USED_WORDS_KEY = 'wordmaster_used_words_v1'

export function wordValue(item) {
  return String(typeof item === 'string' ? item : item?.word || '').trim().toLowerCase()
}

export function getUsedWords() {
  try {
    return new Set(JSON.parse(localStorage.getItem(USED_WORDS_KEY) || '[]'))
  } catch {
    return new Set()
  }
}

function writeUsedWords(words) {
  try {
    localStorage.setItem(USED_WORDS_KEY, JSON.stringify([...words]))
  } catch {
    // Games still work when storage is blocked; uniqueness is best-effort for that session.
  }
}

export function hasUsedWord(word) {
  return getUsedWords().has(wordValue(word))
}

export function rememberWords(words = []) {
  const used = getUsedWords()
  words.map(wordValue).filter(Boolean).forEach((word) => used.add(word))
  writeUsedWords(used)
}

export function rememberWord(word) {
  rememberWords([word])
}

export function pickUnusedWords(candidates = [], count = 1, getWord = wordValue) {
  const used = getUsedWords()
  const picked = []
  const pickedWords = new Set()

  for (const candidate of shuffle(candidates)) {
    const word = wordValue(getWord(candidate))
    if (!word || used.has(word) || pickedWords.has(word)) continue
    picked.push(candidate)
    pickedWords.add(word)
    if (picked.length >= count) break
  }

  rememberWords([...pickedWords])
  return picked
}

export function pickUnusedWord(candidates = [], getWord = wordValue) {
  return pickUnusedWords(candidates, 1, getWord)[0] || null
}
