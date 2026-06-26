import { ALL_WORDS, shuffle } from './wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from './uniqueWords'

const GRID_SIZE = 8
const ANCHOR_ROW = 3

function clueFor(entry) {
  return entry.definition || `A ${entry.word.length}-letter word.`
}

function pickEntry(candidates) {
  return pickUnusedWord(candidates, ({ word }) => word)
}

export function buildDynamicCrossword(level = 1) {
  const anchorPool = ALL_WORDS.filter(({ word, definition }) =>
    definition && word.length >= 5 && word.length <= GRID_SIZE)
  const anchor = pickEntry(anchorPool)
  if (!anchor) return { gridSize: GRID_SIZE, entries: [] }

  const entries = [{
    word: anchor.word,
    definition: clueFor(anchor),
    row: ANCHOR_ROW,
    col: 0,
    direction: 'across',
    clueNumber: 1,
  }]
  const used = new Set([anchor.word])
  const targetEntries = Math.min(7, 4 + Math.floor(level / 4))

  anchor.word.split('').some((letter, col) => {
    const candidates = shuffle(ALL_WORDS.filter(({ word, definition }) =>
      definition &&
      word.length >= 4 &&
      word.length <= 6 &&
      word.includes(letter) &&
      !used.has(word) &&
      !hasUsedWord(word)))

    const candidate = candidates.find(({ word }) => {
      const letterIndex = word.indexOf(letter)
      const row = ANCHOR_ROW - letterIndex
      return row >= 0 && row + word.length <= GRID_SIZE
    })
    if (!candidate) return false

    const letterIndex = candidate.word.indexOf(letter)
    rememberWord(candidate.word)
    used.add(candidate.word)
    entries.push({
      word: candidate.word,
      definition: clueFor(candidate),
      row: ANCHOR_ROW - letterIndex,
      col,
      direction: 'down',
      clueNumber: entries.length + 1,
    })
    return entries.length >= targetEntries
  })

  return {
    gridSize: GRID_SIZE,
    difficulty: 'dynamic',
    entries,
  }
}
