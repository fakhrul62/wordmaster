import { useEffect, useMemo, useRef, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { getXPForLevel, shuffle, VALID_WORDS } from '../utils/wordUtils'
import { getUsedWords, rememberWords } from '../utils/uniqueWords'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const MAX_GRID_SIZE = 20
const FOUND_COLORS = ['#5cf8a0', '#5cf8d0', '#ffd45c', '#ff5f8f', '#8268ff', '#f97316', '#38bdf8', '#d946ef']
const DIRECTIONS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]
const EASY_DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]
const TARGET_WORD_BANK_SIZE = 12000

const DIFFICULTIES = {
  easy: { key: 'easy', label: 'Easy', rows: 8, cols: 8, wordCount: 6, allowBackwards: false },
  medium: { key: 'medium', label: 'Medium', rows: 10, cols: 10, wordCount: 9, allowBackwards: true },
  hard: { key: 'hard', label: 'Hard', rows: 12, cols: 12, wordCount: 12, allowBackwards: true },
}

const THEMES = [
  {
    name: 'Cave Ecosystem',
    words: ['BAT', 'BLIND', 'DARKNESS', 'DRIP', 'GECKO', 'GROTTO', 'MOSS', 'OLMS', 'SPELUNK', 'STONE', 'CRYSTAL', 'ECHO'],
  },
  {
    name: 'Ocean Drift',
    words: ['CORAL', 'TIDE', 'WHALE', 'SHARK', 'REEF', 'KELP', 'SQUID', 'DOLPHIN', 'CURRENT', 'ISLAND', 'TURTLE', 'ANCHOR'],
  },
  {
    name: 'Deep Space',
    words: ['COMET', 'ORBIT', 'PLANET', 'ROCKET', 'STAR', 'NOVA', 'LUNAR', 'METEOR', 'GALAXY', 'ASTRAL', 'SATURN', 'NEBULA'],
  },
  {
    name: 'Forest Trail',
    words: ['MAPLE', 'CEDAR', 'PINE', 'OAK', 'RIVER', 'BADGER', 'CANOPY', 'ACORN', 'THICKET', 'SPRUCE', 'WILLOW', 'BRANCH'],
  },
  {
    name: 'City Pulse',
    words: ['METRO', 'TAXI', 'BRIDGE', 'MARKET', 'TOWER', 'PLAZA', 'STREET', 'MUSEUM', 'SIGNAL', 'SUBWAY', 'GARDEN', 'OFFICE'],
  },
]

const emptySelecting = {
  active: false,
  startCell: null,
  lockedDir: null,
  highlightedCells: [],
}

function cleanWord(word) {
  return String(word || '').toUpperCase().replace(/[^A-Z]/g, '')
}

const WORD_BANK = [...new Set(VALID_WORDS
  .map(cleanWord)
  .filter((word) =>
    word.length >= 3 &&
    word.length <= 8 &&
    /[AEIOUY]/.test(word) &&
    !/(.)\1\1/.test(word)))]

function cellKey(cell) {
  return `${cell.row},${cell.col}`
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function directionFromCells(start, end) {
  const rowDelta = end.row - start.row
  const colDelta = end.col - start.col
  if (!rowDelta && !colDelta) return null
  if (rowDelta !== 0 && colDelta !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) return null
  return [Math.sign(rowDelta), Math.sign(colDelta)]
}

function pathBetween(start, end, direction, rows, cols) {
  const rowDelta = end.row - start.row
  const colDelta = end.col - start.col
  if (!direction || Math.sign(rowDelta) !== direction[0] || Math.sign(colDelta) !== direction[1]) return []
  if (direction[0] === 0 && rowDelta !== 0) return []
  if (direction[1] === 0 && colDelta !== 0) return []
  if (direction[0] !== 0 && direction[1] !== 0 && Math.abs(rowDelta) !== Math.abs(colDelta)) return []
  const steps = Math.max(Math.abs(rowDelta), Math.abs(colDelta))
  return Array.from({ length: steps + 1 }, (_, index) => {
    const row = start.row + direction[0] * index
    const col = start.col + direction[1] * index
    return row >= 0 && row < rows && col >= 0 && col < cols ? { row, col } : null
  }).filter(Boolean)
}

function generateWordSearch(wordList, {
  rows = 7,
  cols = 8,
  allowBackwards = true,
  colors = FOUND_COLORS,
} = {}) {
  const directions = allowBackwards ? DIRECTIONS : EASY_DIRECTIONS
  const sourceWords = [...new Set(wordList.map(cleanWord).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  let gridRows = rows
  let gridCols = cols

  while (gridRows <= MAX_GRID_SIZE && gridCols <= MAX_GRID_SIZE) {
    const grid = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => ''))
    const placed = []
    let shouldGrow = false

    for (const text of sourceWords) {
      if (text.length > Math.max(gridRows, gridCols)) {
        if (gridRows < MAX_GRID_SIZE || gridCols < MAX_GRID_SIZE) {
          shouldGrow = true
          break
        }
        continue
      }

      let placedWord = false
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const row = Math.floor(Math.random() * gridRows)
        const col = Math.floor(Math.random() * gridCols)
        const [rowStep, colStep] = directions[Math.floor(Math.random() * directions.length)]
        const cells = text.split('').map((letter, index) => ({
          row: row + rowStep * index,
          col: col + colStep * index,
          letter,
        }))
        const valid = cells.every((cell) =>
          cell.row >= 0 &&
          cell.row < gridRows &&
          cell.col >= 0 &&
          cell.col < gridCols &&
          (!grid[cell.row][cell.col] || grid[cell.row][cell.col] === cell.letter))
        if (!valid) continue
        cells.forEach((cell) => { grid[cell.row][cell.col] = cell.letter })
        placed.push({
          text,
          cells: cells.map(({ row, col }) => ({ row, col })),
          found: false,
          color: colors[placed.length % colors.length],
        })
        placedWord = true
        break
      }

      if (!placedWord && (gridRows < MAX_GRID_SIZE || gridCols < MAX_GRID_SIZE)) {
        shouldGrow = true
        break
      }
    }

    if (shouldGrow) {
      gridRows = Math.min(MAX_GRID_SIZE, gridRows + 1)
      gridCols = Math.min(MAX_GRID_SIZE, gridCols + 1)
      continue
    }

    grid.forEach((row, rowIndex) => row.forEach((letter, colIndex) => {
      if (!letter) grid[rowIndex][colIndex] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    }))
    return { grid, words: placed }
  }

  return { grid: [], words: [] }
}

function normalizeScopePart(value) {
  return String(value || 'guest').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_') || 'guest'
}

function getPlayerWordScope(player, gameKey = 'wordsearchpuzzle') {
  let fallback = 'guest'
  try {
    fallback = localStorage.getItem('wordmaster_current_user') || fallback
  } catch {
    // Keep generation available when storage is blocked.
  }
  const playerKey = player?.accountEmail || player?.username || fallback
  return `${gameKey}_${normalizeScopePart(playerKey)}`
}

function pickPuzzleWords(theme, difficulty, level, scope) {
  const used = getUsedWords(scope)
  const maxLength = Math.max(difficulty.rows, difficulty.cols)
  const themeWords = shuffle(theme.words.map(cleanWord))
    .filter((word) => word.length <= maxLength && !used.has(word.toLowerCase()))
  const dictionaryWords = WORD_BANK
    .filter((word) => word.length <= maxLength && !used.has(word.toLowerCase()))
  const levelOffset = dictionaryWords.length ? (level * difficulty.wordCount) % dictionaryWords.length : 0
  const rotatedDictionary = dictionaryWords.slice(levelOffset).concat(dictionaryWords.slice(0, levelOffset))
  const themeTarget = Math.min(themeWords.length, Math.max(1, Math.floor(difficulty.wordCount / 3)))
  const candidates = [
    ...themeWords.slice(0, themeTarget),
    ...shuffle(rotatedDictionary).slice(0, Math.max(TARGET_WORD_BANK_SIZE, difficulty.wordCount * 80)),
    ...themeWords.slice(themeTarget),
  ]
  const picked = []
  const seen = new Set()

  for (const word of candidates) {
    if (!word || seen.has(word) || used.has(word.toLowerCase())) continue
    picked.push(word)
    seen.add(word)
    if (picked.length >= difficulty.wordCount) break
  }

  return picked
}

function buildPuzzle(theme, difficulty, level, player, gameKey) {
  const scope = getPlayerWordScope(player, gameKey)
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const chosenWords = pickPuzzleWords(theme, difficulty, level + attempt, scope)
    const puzzle = generateWordSearch(chosenWords, difficulty)
    if (puzzle.words.length >= 4) {
      rememberWords(puzzle.words.map(({ text }) => text), scope)
      return puzzle
    }
  }

  const fallbackWords = shuffle(WORD_BANK).slice(0, difficulty.wordCount)
  const fallbackPuzzle = generateWordSearch(fallbackWords, difficulty)
  if (fallbackPuzzle.words.length >= 4) {
    rememberWords(fallbackPuzzle.words.map(({ text }) => text), scope)
    return fallbackPuzzle
  }
  return { grid: [], words: [] }
}

function lineStyle(cells, rows, cols) {
  if (cells.length < 2) return {}
  const start = cells[0]
  const end = cells.at(-1)
  const x1 = (start.col + 0.5) * (100 / cols)
  const y1 = (start.row + 0.5) * (100 / rows)
  const x2 = (end.col + 0.5) * (100 / cols)
  const y2 = (end.row + 0.5) * (100 / rows)
  return {
    left: `${x1}%`,
    top: `${y1}%`,
    width: `${Math.hypot(x2 - x1, y2 - y1)}%`,
    height: `${(100 / rows) * 0.62}%`,
    transform: `translateY(-50%) rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`,
  }
}

function WordSearchPuzzle({
  level,
  gameKey = 'wordsearchpuzzle',
  player = null,
  onComplete,
  hapticsEnabled = true,
  soundEnabled = true,
  timerMode = true,
  xpMultiplier = 1,
  streakMultiplier = 1,
}) {
  const [phase, setPhase] = useState('difficulty')
  const [difficulty, setDifficulty] = useState(null)
  const [theme, setTheme] = useState(null)
  const [grid, setGrid] = useState([])
  const [words, setWords] = useState([])
  const [foundCells, setFoundCells] = useState({})
  const [selecting, setSelecting] = useState(emptySelecting)
  const [elapsed, setElapsed] = useState(0)
  const [finalTime, setFinalTime] = useState(null)
  const startedAt = useRef(0)
  const completedRef = useRef(false)
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const boardRef = useRef(null)

  const foundCount = words.filter(({ found }) => found).length
  const score = foundCount * 120
  const activeCellKeys = useMemo(
    () => new Set(selecting.highlightedCells.map(cellKey)),
    [selecting.highlightedCells],
  )

  useEffect(() => {
    if (phase !== 'playing' || !timerMode) return undefined
    const timer = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }, 250)
    return () => window.clearInterval(timer)
  }, [phase])

  function startPuzzle(nextDifficulty = difficulty, nextTheme = theme) {
    const puzzle = buildPuzzle(nextTheme, nextDifficulty, level, player, gameKey)
    setDifficulty(nextDifficulty)
    setTheme(nextTheme)
    setGrid(puzzle.grid)
    setWords(puzzle.words)
    setFoundCells({})
    setSelecting(emptySelecting)
    setElapsed(0)
    setFinalTime(null)
    completedRef.current = false
    startedAt.current = Date.now()
    setPhase(puzzle.words.length >= 4 ? 'playing' : 'empty')
  }

  function cellFromPointer(event) {
    const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-wsp-cell]')
    if (!element || !boardRef.current?.contains(element)) return null
    return {
      row: Number(element.dataset.row),
      col: Number(element.dataset.col),
    }
  }

  function pointerDown(cell, event) {
    if (phase !== 'playing') return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    triggerHaptic(hapticsEnabled, 8)
    playSound('key', soundEnabled)
    setSelecting({
      active: true,
      startCell: cell,
      lockedDir: null,
      highlightedCells: [cell],
    })
  }

  function pointerMove(event) {
    if (phase !== 'playing' || !selecting.active) return
    event.preventDefault()
    const currentCell = cellFromPointer(event)
    if (!currentCell) return
    setSelecting((current) => {
      if (!current.active || !current.startCell) return current
      const nextDir = current.lockedDir || directionFromCells(current.startCell, currentCell)
      if (!nextDir) return current
      const highlightedCells = pathBetween(current.startCell, currentCell, nextDir, rows, cols)
      if (highlightedCells.length < 2) return current
      return {
        ...current,
        lockedDir: nextDir,
        highlightedCells,
      }
    })
  }

  function pointerUp() {
    if (phase !== 'playing' || !selecting.active) return
    const highlightedCells = selecting.highlightedCells
    const selectedText = highlightedCells.map(({ row, col }) => grid[row][col]).join('')
    const reversedText = selectedText.split('').reverse().join('')
    const match = highlightedCells.length > 1
      ? words.find((word) => !word.found && (word.text === selectedText || word.text === reversedText))
      : null

    if (!match) {
      setSelecting(emptySelecting)
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      return
    }

    triggerHaptic(hapticsEnabled, 18)
    playSound('correct', soundEnabled)
    const nextFoundCells = { ...foundCells }
    highlightedCells.forEach((cell) => { nextFoundCells[cellKey(cell)] = match.color })
    const nextWords = words.map((word) =>
      word.text === match.text ? { ...word, found: true, cells: highlightedCells } : word)
    const complete = nextWords.every(({ found }) => found)

    setWords(nextWords)
    setFoundCells(nextFoundCells)
    setSelecting(emptySelecting)

    if (complete && !completedRef.current) {
      completedRef.current = true
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsed(seconds)
      setFinalTime(seconds)
      setPhase('won')
      onComplete(Math.max(100, score + match.text.length * 60), getXPForLevel(level), level + 1, {
        completionTime: seconds,
      })
    }
  }

  if (phase === 'difficulty') {
    return (
      <div className="game-panel wsp-shell">
        <section className="choice-panel wsp-choice">
          <p className="eyebrow">Word Search Puzzle</p>
          <h1>Pick difficulty</h1>
          <div className="wsp-option-grid">
            {Object.values(DIFFICULTIES).map((item) => (
              <button
                className="btn-secondary"
                key={item.key}
                onClick={() => {
                  setDifficulty(item)
                  setPhase('theme')
                }}
              >
                <strong>{item.label}</strong>
                <small>{item.rows}x{item.cols} · {item.wordCount} words</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (phase === 'theme') {
    return (
      <div className="game-panel wsp-shell">
        <section className="choice-panel wsp-choice">
          <p className="eyebrow">{difficulty.label}</p>
          <h1>Pick theme</h1>
          <div className="wsp-option-grid">
            {THEMES.map((item) => (
              <button className="btn-secondary" key={item.name} onClick={() => startPuzzle(difficulty, item)}>
                <strong>{item.name}</strong>
                <small>{item.words.length} words</small>
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => startPuzzle(difficulty, shuffle(THEMES)[0])}>RANDOM THEME</button>
        </section>
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="game-panel wsp-shell">
        <section className="result-panel">
          <p className="eyebrow">Board reset</p>
          <strong>Preparing fresh words</strong>
          <button className="btn-primary" onClick={() => startPuzzle(difficulty, theme)}>TRY AGAIN</button>
        </section>
      </div>
    )
  }

  return (
    <div className="game-panel wsp-shell">
      <ScoreBar
        score={score}
        xp={Math.round(getXPForLevel(level) * xpMultiplier)}
        xpMultiplier={xpMultiplier}
        streakMultiplier={streakMultiplier}
        streakCount={player?.streak?.count || 0}
      />
      <div className="status-row wsp-status">
        <span className="neutral-status">{theme.name}</span>
        <strong>{timerMode ? formatTime(finalTime ?? elapsed) : 'No limit'}</strong>
        <span>{foundCount}/{words.length}</span>
      </div>

      <section className="wsp-word-list" aria-label="Words to find">
        {words.map((word) => (
          <span
            className={word.found ? 'found' : ''}
            key={word.text}
            style={{ '--wsp-word-color': word.color }}
          >
            {word.text}
          </span>
        ))}
      </section>

      <section
        className="wsp-board"
        ref={boardRef}
        onPointerMove={pointerMove}
        onPointerCancel={() => setSelecting(emptySelecting)}
        onPointerLeave={() => { if (selecting.active) setSelecting(emptySelecting) }}
        onPointerUp={pointerUp}
        style={{
          '--wsp-rows': rows,
          '--wsp-cols': cols,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
        aria-label="Word search grid"
      >
        {words.filter(({ found }) => found).map((word) => (
          <span
            className="wsp-line"
            key={word.text}
            style={{ ...lineStyle(word.cells, rows, cols), background: word.color }}
          />
        ))}
        {selecting.highlightedCells.length > 1 && (
          <span
            className="wsp-line active"
            style={lineStyle(selecting.highlightedCells, rows, cols)}
          />
        )}
        {grid.flatMap((row, rowIndex) => row.map((letter, colIndex) => {
          const key = `${rowIndex},${colIndex}`
          return (
            <button
              className={`wsp-cell ${foundCells[key] ? 'found' : ''} ${activeCellKeys.has(key) ? 'active' : ''}`}
              data-wsp-cell="true"
              data-row={rowIndex}
              data-col={colIndex}
              key={key}
              onPointerDown={(event) => pointerDown({ row: rowIndex, col: colIndex }, event)}
              style={{ '--wsp-found-cell-color': foundCells[key] || 'transparent' }}
            >
              {letter}
            </button>
          )
        }))}
      </section>

      {phase === 'won' && (
        <section className="result-panel wsp-win">
          <p className="eyebrow">Complete</p>
          <strong>{formatTime(finalTime || elapsed)}</strong>
          <button className="btn-primary" onClick={() => startPuzzle(difficulty, theme)}>PLAY AGAIN</button>
          <button className="btn-secondary" onClick={() => setPhase('difficulty')}>CHANGE SETUP</button>
        </section>
      )}
    </div>
  )
}

export default WordSearchPuzzle
