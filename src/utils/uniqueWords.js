import { shuffle } from './wordUtils'

const USED_WORDS_KEY = 'wordmaster_used_words_v1'

function scopedKey(scope = '') {
  const suffix = String(scope || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')
  return suffix ? `${USED_WORDS_KEY}_${suffix}` : USED_WORDS_KEY
}

export function wordValue(item) {
  return String(typeof item === 'string' ? item : item?.word || '').trim().toLowerCase()
}

export function getUsedWords(scope = '') {
  try {
    return new Set(JSON.parse(localStorage.getItem(scopedKey(scope)) || '[]'))
  } catch {
    return new Set()
  }
}

function writeUsedWords(words, scope = '') {
  try {
    localStorage.setItem(scopedKey(scope), JSON.stringify([...words]))
  } catch {
    // Games still work when storage is blocked; uniqueness is best-effort for that session.
  }
}

export function hasUsedWord(word, scope = '') {
  return getUsedWords(scope).has(wordValue(word))
}

export function rememberWords(words = [], scope = '') {
  const used = getUsedWords(scope)
  words.map(wordValue).filter(Boolean).forEach((word) => used.add(word))
  writeUsedWords(used, scope)
}

export function rememberWord(word, scope = '') {
  rememberWords([word], scope)
}

export function pickUnusedWords(candidates = [], count = 1, getWord = wordValue, scope = '') {
  const used = getUsedWords(scope)
  const picked = []
  const pickedWords = new Set()

  for (const candidate of shuffle(candidates)) {
    const word = wordValue(getWord(candidate))
    if (!word || used.has(word) || pickedWords.has(word)) continue
    picked.push(candidate)
    pickedWords.add(word)
    if (picked.length >= count) break
  }

  rememberWords([...pickedWords], scope)
  return picked
}

export function pickUnusedWord(candidates = [], getWord = wordValue, scope = '') {
  return pickUnusedWords(candidates, 1, getWord, scope)[0] || null
}
