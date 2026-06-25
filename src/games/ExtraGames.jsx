import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { triggerHaptic } from '../utils/haptics'
import {
  ALL_WORDS,
  CROSSCLUE_GRIDS,
  getLetterLockSets,
  getSubWords,
  getWordsByCategory,
  getXPForLevel,
  isValidWord,
  shuffle,
} from '../utils/wordUtils'

const CATEGORIES = ['common', 'medium', 'hard']
const SORT_LABELS = { common: 'Common', medium: 'Medium', hard: 'Hard' }
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
const RHYME_GROUPS = [
  { clue: 'light', ending: 'ight' },
  { clue: 'stone', ending: 'one' },
  { clue: 'game', ending: 'ame' },
  { clue: 'sound', ending: 'ound' },
]
const SYNONYM_PAIRS = [
  ['fast', 'quick'],
  ['big', 'large'],
  ['small', 'tiny'],
  ['smart', 'clever'],
  ['happy', 'glad'],
  ['calm', 'quiet'],
  ['start', 'begin'],
  ['end', 'finish'],
]
const QUOTES = [
  { text: 'Knowledge is power', answer: 'power' },
  { text: 'Practice makes progress', answer: 'progress' },
  { text: 'Words build worlds', answer: 'worlds' },
  { text: 'Stay curious always', answer: 'curious' },
  { text: 'Read more learn more', answer: 'learn' },
]
const LADDERS = [
  ['cat', 'cot', 'dot', 'dog'],
  ['cold', 'cord', 'card', 'ward', 'warm'],
  ['lead', 'load', 'goad', 'gold'],
  ['same', 'came', 'cane', 'lane', 'land'],
]

function pickWordEntries(level, count, options = {}) {
  const category = options.category || CATEGORIES[Math.floor((level - 1) / 4) % CATEGORIES.length]
  const minLength = options.minLength || 3
  const maxLength = options.maxLength || 8
  return shuffle(getWordsByCategory(category).filter(({ word, definition }) =>
    word.length >= minLength && word.length <= maxLength && definition,
  )).slice(0, count)
}

function scoreFor(words, bonus = 0) {
  return words.reduce((total, word) => total + String(word).length * 20, bonus)
}

function finishGame(onComplete, level, score) {
  onComplete(score, getXPForLevel(level), level + 1)
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function TextAnswer({ value, onChange, onSubmit, placeholder = 'Type answer...' }) {
  return (
    <form className="game-form" onSubmit={onSubmit}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^a-z]/gi, ''))}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck="false"
      />
      <button className="btn-primary" type="submit">SUBMIT</button>
    </form>
  )
}

function WordSearch({ level, onComplete, showToast, hapticsEnabled = true }) {
  const size = 8
  const puzzle = useMemo(() => {
    const targetWords = Math.min(7, 5 + Math.floor(level / 8))
    const candidates = pickWordEntries(level, targetWords + 12, { minLength: 4, maxLength: 7 }).map(({ word }) => word)
    const grid = Array.from({ length: size }, () => Array.from({ length: size }, () => ''))
    const words = []
    const placements = {}
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1], [0, -1], [-1, 0], [-1, -1], [-1, 1]]
    const starts = Array.from({ length: size * size }, (_, index) => ({
      row: Math.floor(index / size),
      col: index % size,
    })).sort((a, b) => {
      const center = (size - 1) / 2
      return Math.hypot(a.row - center, a.col - center) - Math.hypot(b.row - center, b.col - center)
    })

    function findPath(word) {
      const canUse = ({ row, col }, letter, used) =>
        row >= 0 &&
        row < size &&
        col >= 0 &&
        col < size &&
        !used.has(`${row}-${col}`) &&
        (!grid[row][col] || grid[row][col] === letter)

      function walk(path, letterIndex, previousDirection, turned, used) {
        if (letterIndex >= word.length) return turned || word.length < 5 ? path : null
        const current = path.at(-1)
        const nextDirections = shuffle(directions).sort((first, second) => {
          const firstStraight = previousDirection && first[0] === previousDirection[0] && first[1] === previousDirection[1]
          const secondStraight = previousDirection && second[0] === previousDirection[0] && second[1] === previousDirection[1]
          return Number(firstStraight) - Number(secondStraight)
        })
        for (const direction of nextDirections) {
          const nextCell = { row: current.row + direction[0], col: current.col + direction[1] }
          const key = `${nextCell.row}-${nextCell.col}`
          const nextTurned = turned || Boolean(previousDirection && (direction[0] !== previousDirection[0] || direction[1] !== previousDirection[1]))
          if (!canUse(nextCell, word[letterIndex], used)) continue
          used.add(key)
          const result = walk([...path, { ...nextCell, letter: word[letterIndex] }], letterIndex + 1, direction, nextTurned, used)
          if (result) return result
          used.delete(key)
        }
        return null
      }

      for (const start of starts) {
        const key = `${start.row}-${start.col}`
        if (!canUse(start, word[0], new Set())) continue
        const result = walk([{ ...start, letter: word[0] }], 1, null, false, new Set([key]))
        if (result) return result
      }
      return null
    }

    for (const word of candidates) {
      const cells = findPath(word)
      if (!cells) continue
      cells.forEach((cell) => { grid[cell.row][cell.col] = cell.letter })
      words.push(word)
      placements[word] = cells.map((cell) => `${cell.row}-${cell.col}`)
      if (words.length >= targetWords) break
    }
    grid.forEach((row, rowIndex) => row.forEach((letter, colIndex) => {
      if (!letter) grid[rowIndex][colIndex] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    }))
    return { words, grid, placements }
  }, [level])
  const [selected, setSelected] = useState([])
  const [found, setFound] = useState([])
  const score = scoreFor(found)

  function choose(cell) {
    triggerHaptic(hapticsEnabled)
    const next = selected.includes(cell) ? selected.filter((item) => item !== cell) : [...selected, cell]
    setSelected(next)
    const match = puzzle.words.find((word) =>
      !found.includes(word) &&
      next.join('|') === puzzle.placements[word].join('|'))
    if (!match) return
    const nextFound = [...found, match]
    setFound(nextFound)
    setSelected([])
    showToast(`${match.toUpperCase()} found`, 'success')
    if (nextFound.length === puzzle.words.length) finishGame(onComplete, level, scoreFor(nextFound, 100))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <div className="status-row">
        <span className="neutral-status">Found</span>
        <strong>{found.length}/{puzzle.words.length}</strong>
        {selected.length > 0 && <span>{selected.length} selected</span>}
      </div>
      <div className="word-search-grid" style={{ gridTemplateColumns: `repeat(${size},1fr)` }}>
        {puzzle.grid.flatMap((row, rowIndex) => row.map((letter, colIndex) => {
          const cell = `${rowIndex}-${colIndex}`
          const solved = found.some((word) => puzzle.placements[word].includes(cell))
          return (
            <button className={`word-search-cell ${selected.includes(cell) ? 'selected' : ''} ${solved ? 'correct' : ''}`} key={cell} onClick={() => choose(cell)}>
              {letter}
            </button>
          )
        }))}
      </div>
      <div className="word-search-actions">
        <button className="btn-secondary" onClick={() => setSelected([])} disabled={!selected.length}>CLEAR SELECTION</button>
      </div>
    </div>
  )
}

function TypingSprint({ level, onComplete, showToast, hapticsEnabled = true }) {
  const words = useMemo(() => pickWordEntries(level, Math.min(12, 5 + level), { minLength: 3, maxLength: 8 }).map(({ word }) => word), [level])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const current = words[index]

  function submit(event) {
    event.preventDefault()
    if (normalize(input) !== current) return showToast('Type the word exactly.', 'error')
    const nextScore = score + current.length * 25
    const nextIndex = index + 1
    triggerHaptic(hapticsEnabled)
    setScore(nextScore)
    setInput('')
    if (nextIndex >= words.length) finishGame(onComplete, level, nextScore)
    else setIndex(nextIndex)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <div className="status-row"><span className="neutral-status">Word</span><strong>{index + 1}/{words.length}</strong></div>
      <section className="prompt-card"><strong className="big-letter compact-word">{current}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
    </div>
  )
}

function SpellingBee({ level, onComplete, showToast }) {
  const puzzle = useMemo(() => {
    const set = shuffle(getLetterLockSets())[0]
    const source = set?.word || 'letters'
    const center = source[Math.floor(source.length / 2)]
    const answers = shuffle(getSubWords(source, center)).slice(0, Math.min(10, 4 + level))
    return { source, center, answers }
  }, [level])
  const [input, setInput] = useState('')
  const [found, setFound] = useState([])
  const score = scoreFor(found)

  function submit(event) {
    event.preventDefault()
    const word = normalize(input)
    if (!word.includes(puzzle.center)) return showToast(`Use ${puzzle.center.toUpperCase()}.`, 'error')
    if (!puzzle.answers.includes(word)) return showToast('That word is not in this hive.', 'error')
    if (found.includes(word)) return showToast('Already found.', 'info')
    const nextFound = [...found, word]
    setFound(nextFound)
    setInput('')
    if (nextFound.length >= puzzle.answers.length) finishGame(onComplete, level, scoreFor(nextFound, 120))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Required letter</p><strong className="big-letter">{puzzle.center}</strong><p className="mono">{puzzle.source.toUpperCase().split('').join(' ')}</p></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
      <div className="found-words">{found.map((word) => <span className="found-word-chip" key={word}>{word}</span>)}</div>
    </div>
  )
}

function WordLadder({ level, onComplete, showToast }) {
  const path = useMemo(() => LADDERS[(level - 1) % LADDERS.length], [level])
  const [steps, setSteps] = useState([path[0]])
  const [input, setInput] = useState('')
  const current = steps.at(-1)
  const target = path.at(-1)

  function differsByOne(a, b) {
    return a.length === b.length && a.split('').filter((letter, index) => letter !== b[index]).length === 1
  }

  function submit(event) {
    event.preventDefault()
    const word = normalize(input)
    if (!differsByOne(current, word)) return showToast('Change exactly one letter.', 'error')
    if (!isValidWord(word)) return showToast('Use a valid word.', 'error')
    if (steps.includes(word)) return showToast('Already used.', 'error')
    const nextSteps = [...steps, word]
    setSteps(nextSteps)
    setInput('')
    if (word === target) finishGame(onComplete, level, Math.max(100, 700 - nextSteps.length * 60))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={steps.length * 30} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Transform</p><strong className="big-letter compact-word">{current} → {target}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
      <div className="chain-list">{steps.map((word) => <span className="word-chip" key={word}>{word}</span>)}</div>
    </div>
  )
}

function DefinitionDuel({ level, onComplete, showToast }) {
  const words = useMemo(() => pickWordEntries(level, 5, { minLength: 4, maxLength: 8 }), [level])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const current = words[index]

  function submit(event) {
    event.preventDefault()
    if (normalize(input) !== current.word) return showToast(`${current.word.length} letters. Try again.`, 'error')
    const nextScore = score + current.word.length * 45
    setScore(nextScore)
    setInput('')
    if (index + 1 >= words.length) finishGame(onComplete, level, nextScore)
    else setIndex(index + 1)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <section className="active-clue"><p className="eyebrow">{current.word.length} letters</p><h2>{current.definition}</h2></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
    </div>
  )
}

function MissingLetter({ level, onComplete, showToast }) {
  const words = useMemo(() => pickWordEntries(level, 6, { minLength: 4, maxLength: 8 }), [level])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const current = words[index].word
  const masked = current.split('').map((letter, letterIndex) =>
    (letterIndex + level + index) % 3 === 0 ? '_' : letter).join(' ')

  function submit(event) {
    event.preventDefault()
    if (normalize(input) !== current) return showToast('Fill the whole word.', 'error')
    const nextScore = score + current.length * 30
    setScore(nextScore)
    setInput('')
    if (index + 1 >= words.length) finishGame(onComplete, level, nextScore)
    else setIndex(index + 1)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Complete the word</p><strong className="big-letter compact-word">{masked}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
    </div>
  )
}

function SynonymMatch({ level, onComplete, showToast }) {
  const pairs = useMemo(() => shuffle(SYNONYM_PAIRS).slice(0, Math.min(6, 3 + Math.floor(level / 2))), [level])
  const [left, setLeft] = useState('')
  const [matched, setMatched] = useState([])
  const rightWords = useMemo(() => shuffle(pairs.map((pair) => pair[1])), [pairs])

  function chooseRight(word) {
    if (!left) return showToast('Pick a word first.', 'info')
    const pair = pairs.find(([source]) => source === left)
    if (pair?.[1] !== word) return showToast('Not a match.', 'error')
    const nextMatched = [...matched, left]
    setMatched(nextMatched)
    setLeft('')
    if (nextMatched.length >= pairs.length) finishGame(onComplete, level, pairs.length * 120)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={matched.length * 120} xp={getXPForLevel(level)} />
      <div className="match-grid">
        <div>{pairs.map(([word]) => <button className={`btn-secondary ${left === word ? 'selected' : ''}`} disabled={matched.includes(word)} key={word} onClick={() => setLeft(word)}>{word}</button>)}</div>
        <div>{rightWords.map((word) => <button className="btn-secondary" disabled={matched.some((item) => pairs.find(([source]) => source === item)?.[1] === word)} key={word} onClick={() => chooseRight(word)}>{word}</button>)}</div>
      </div>
    </div>
  )
}

function CategoryRush({ level, onComplete, showToast }) {
  const length = 3 + ((level - 1) % 4)
  const target = Math.min(8, 3 + level)
  const [input, setInput] = useState('')
  const [found, setFound] = useState([])

  function submit(event) {
    event.preventDefault()
    const word = normalize(input)
    if (word.length !== length) return showToast(`Use ${length} letters.`, 'error')
    if (!isValidWord(word)) return showToast('Use a valid word.', 'error')
    if (found.includes(word)) return showToast('Already used.', 'error')
    const nextFound = [...found, word]
    setFound(nextFound)
    setInput('')
    if (nextFound.length >= target) finishGame(onComplete, level, scoreFor(nextFound, 100))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={scoreFor(found)} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Collect</p><strong className="big-letter compact-word">{length}-letter words</strong><p>{found.length}/{target}</p></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
      <div className="chain-list">{found.map((word) => <span className="word-chip" key={word}>{word}</span>)}</div>
    </div>
  )
}

function WordSort({ level, onComplete, showToast }) {
  const words = useMemo(() => shuffle(CATEGORIES.flatMap((category) =>
    getWordsByCategory(category).filter(({ word }) => word.length >= 4 && word.length <= 7).slice(0, 24),
  )).slice(0, 6), [level])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const current = words[index]

  function choose(category) {
    if (category !== current.category) return showToast('Wrong shelf.', 'error')
    const nextScore = score + 80
    setScore(nextScore)
    if (index + 1 >= words.length) finishGame(onComplete, level, nextScore)
    else setIndex(index + 1)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Sort this word</p><strong className="big-letter compact-word">{current.word}</strong></section>
      <div className="button-grid">
        {CATEGORIES.map((category) => <button className="btn-secondary" key={category} onClick={() => choose(category)}>{SORT_LABELS[category]}</button>)}
      </div>
    </div>
  )
}

function CipherWords({ level, onComplete, showToast }) {
  const words = useMemo(() => pickWordEntries(level, 5, { minLength: 4, maxLength: 7 }).map(({ word }) => word), [level])
  const shift = (level % 5) + 1
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const current = words[index]
  const cipher = current.split('').map((letter) => ALPHABET[(ALPHABET.indexOf(letter) + shift) % 26]).join('')

  function submit(event) {
    event.preventDefault()
    if (normalize(input) !== current) return showToast(`Shift is -${shift}.`, 'error')
    const nextScore = score + current.length * 40
    setScore(nextScore)
    setInput('')
    if (index + 1 >= words.length) finishGame(onComplete, level, nextScore)
    else setIndex(index + 1)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Decode shift -{shift}</p><strong className="big-letter compact-word">{cipher}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
    </div>
  )
}

function CrosswordDaily({ level, onComplete, showToast, hapticsEnabled = true }) {
  const grid = useMemo(() => CROSSCLUE_GRIDS[(level - 1) % CROSSCLUE_GRIDS.length], [level])
  const [answers, setAnswers] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [, setCursor] = useState(0)
  const hiddenInput = useRef(null)
  const answersRef = useRef({})
  const activeIndexRef = useRef(0)
  const cursorRef = useRef(0)
  const active = grid.entries[activeIndex]
  const viewportWidth = typeof window === 'undefined'
    ? 480
    : window.innerWidth >= 1180
      ? Math.min(window.innerWidth * 0.42, 640)
      : Math.min(window.innerWidth, 480)
  const cellSize = Math.max(34, Math.floor((viewportWidth - 32) / grid.gridSize))

  const cells = useMemo(() => {
    const map = new Map()
    grid.entries.forEach((entry, entryIndex) => {
      entry.word.split('').forEach((letter, index) => {
        const row = entry.row + (entry.direction === 'down' ? index : 0)
        const col = entry.col + (entry.direction === 'across' ? index : 0)
        const key = `${row}-${col}`
        const existing = map.get(key) || { row, col, letter, entries: [], numbers: [] }
        existing.entries.push({ entryIndex, index })
        if (index === 0) existing.numbers.push(entry.clueNumber)
        map.set(key, existing)
      })
    })
    return map
  }, [grid])

  function selectEntry(entryIndex, nextCursor = 0) {
    activeIndexRef.current = entryIndex
    cursorRef.current = nextCursor
    setActiveIndex(entryIndex)
    setCursor(nextCursor)
    window.setTimeout(() => hiddenInput.current?.focus(), 0)
  }

  function cellValue(cell) {
    for (const position of cell.entries) {
      const value = answers[position.entryIndex]?.[position.index]
      if (value && value !== ' ') return value
    }
    return ''
  }

  function checkGrid(nextAnswers = answersRef.current) {
    const complete = grid.entries.every((entry, index) => nextAnswers[index] === entry.word)
    if (!complete) return showToast('Some answers need another look.', 'error')
    finishGame(onComplete, level, grid.entries.length * 120)
  }

  const typeLetter = useCallback((letter) => {
    if (!/^[a-z]$/i.test(letter)) return
    triggerHaptic(hapticsEnabled)
    const entryIndex = activeIndexRef.current
    const position = cursorRef.current
    const entry = grid.entries[entryIndex]
    const row = entry.row + (entry.direction === 'down' ? position : 0)
    const col = entry.col + (entry.direction === 'across' ? position : 0)
    const cell = cells.get(`${row}-${col}`)
    const nextAnswers = { ...answersRef.current }
    ;(cell?.entries || [{ entryIndex, index: position }]).forEach(({ entryIndex: linkedEntryIndex, index }) => {
      const linkedEntry = grid.entries[linkedEntryIndex]
      const currentAnswer = (nextAnswers[linkedEntryIndex] || '').padEnd(linkedEntry.word.length, ' ')
      nextAnswers[linkedEntryIndex] = `${currentAnswer.slice(0, index)}${letter.toLowerCase()}${currentAnswer.slice(index + 1)}`.trimEnd()
    })
    const nextCursor = Math.min(entry.word.length - 1, position + 1)
    answersRef.current = nextAnswers
    cursorRef.current = nextCursor
    setAnswers(nextAnswers)
    setCursor(nextCursor)
    if (grid.entries.every((entry, index) => nextAnswers[index] === entry.word)) {
      finishGame(onComplete, level, grid.entries.length * 120)
    }
  }, [cells, grid.entries, hapticsEnabled, level, onComplete])

  const erase = useCallback(() => {
    triggerHaptic(hapticsEnabled)
    const entryIndex = activeIndexRef.current
    const entry = grid.entries[entryIndex]
    const currentAnswer = (answersRef.current[entryIndex] || '').padEnd(entry.word.length, ' ')
    const position = cursorRef.current
    const target = currentAnswer[position] ? position : Math.max(0, position - 1)
    const row = entry.row + (entry.direction === 'down' ? target : 0)
    const col = entry.col + (entry.direction === 'across' ? target : 0)
    const cell = cells.get(`${row}-${col}`)
    const nextAnswers = { ...answersRef.current }
    ;(cell?.entries || [{ entryIndex, index: target }]).forEach(({ entryIndex: linkedEntryIndex, index }) => {
      const linkedEntry = grid.entries[linkedEntryIndex]
      const linkedAnswer = (nextAnswers[linkedEntryIndex] || '').padEnd(linkedEntry.word.length, ' ')
      nextAnswers[linkedEntryIndex] = `${linkedAnswer.slice(0, index)} ${linkedAnswer.slice(index + 1)}`.trimEnd()
    })
    answersRef.current = nextAnswers
    cursorRef.current = target
    setAnswers(nextAnswers)
    setCursor(target)
  }, [cells, grid.entries, hapticsEnabled])

  useEffect(() => {
    hiddenInput.current?.focus()
    const keyboard = (event) => {
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault()
        typeLetter(event.key)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        erase()
      }
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [erase, typeLetter])

  const lettersFilled = Object.values(answers).join('').replace(/\s/g, '').length

  return (
    <div className="game-panel crossclue-panel">
      <ScoreBar score={lettersFilled * 30} xp={getXPForLevel(level)} />
      <div className="crossword-grid" style={{ gridTemplateColumns: `repeat(${grid.gridSize}, ${cellSize}px)` }}>
        {Array.from({ length: grid.gridSize * grid.gridSize }, (_, index) => {
          const row = Math.floor(index / grid.gridSize)
          const col = index % grid.gridSize
          const cell = cells.get(`${row}-${col}`)
          if (!cell) return <span className="crossword-cell black" style={{ width: cellSize, height: cellSize }} key={`${row}-${col}`} />
          const activeCell = cell.entries.some(({ entryIndex }) => entryIndex === activeIndex)
          const correct = cell.entries.every(({ entryIndex, index: letterIndex }) =>
            answers[entryIndex]?.[letterIndex] === grid.entries[entryIndex].word[letterIndex])
          return (
            <button
              className={`crossword-cell ${activeCell ? 'active' : ''} ${correct ? 'correct' : ''}`}
              style={{ width: cellSize, height: cellSize }}
              key={`${row}-${col}`}
              onClick={() => {
                const position = cell.entries.find(({ entryIndex }) => entryIndex === activeIndex) || cell.entries[0]
                const sameCell = activeIndexRef.current === position.entryIndex && cursorRef.current === position.index
                if (sameCell && cellValue(cell)) erase()
                else selectEntry(position.entryIndex, position.index)
              }}
              aria-label={`Row ${row + 1}, column ${col + 1}`}
            >
              {cell.numbers.length > 0 && <small className="cell-number">{cell.numbers.join('/')}</small>}
              {cellValue(cell)}
            </button>
          )
        })}
      </div>
      <input
        ref={hiddenInput}
        className="hidden-crossword-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        defaultValue=""
        onInput={(event) => {
          const value = event.currentTarget.value
          const letter = value.match(/[a-z]/i)?.[0]
          if (letter) typeLetter(letter)
          event.currentTarget.value = ''
        }}
        onKeyDown={(event) => {
          if (event.key === 'Backspace') {
            event.preventDefault()
            event.stopPropagation()
            erase()
          } else if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            checkGrid()
          }
        }}
        aria-label="Daily crossword letter input"
      />
      <section className="active-clue">
        <p className="eyebrow">Selected: {active.clueNumber}-{active.direction === 'across' ? 'Across' : 'Down'}</p>
        <h2>{active.definition}</h2>
        <p>{active.word.length} letters</p>
      </section>
      <section className="clue-panel">
        <div className="panel-title"><span>Daily clues</span><small>Tap to select</small></div>
        <div className="clue-list">
          {grid.entries.map((entry, index) => (
            <button className={index === activeIndex ? 'selected' : ''} key={`${entry.clueNumber}-${entry.direction}`} onClick={() => selectEntry(index)}>
              <strong>{entry.clueNumber}{entry.direction[0].toUpperCase()}</strong>
              <span>{entry.definition}</span>
            </button>
          ))}
        </div>
      </section>
      <button className="btn-primary" onClick={() => checkGrid()}>CHECK GRID</button>
    </div>
  )
}

function QuoteFill({ level, onComplete, showToast }) {
  const quote = QUOTES[(level - 1) % QUOTES.length]
  const [input, setInput] = useState('')
  const display = quote.text.replace(new RegExp(quote.answer, 'i'), '_____')

  function submit(event) {
    event.preventDefault()
    if (normalize(input) !== quote.answer) return showToast('That does not fit the quote.', 'error')
    finishGame(onComplete, level, quote.answer.length * 80)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={0} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Fill the quote</p><strong className="big-letter compact-word">{display}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
    </div>
  )
}

function AnagramBattle({ level, onComplete, showToast }) {
  const puzzle = useMemo(() => {
    const source = shuffle(getLetterLockSets())[0]?.word ||
      shuffle(ALL_WORDS.filter(({ word }) => word.length >= 7 && word.length <= 9))[0]?.word ||
      'triangle'
    const answers = shuffle(getSubWords(source)).slice(0, Math.min(10, 4 + level))
    return { source, answers }
  }, [level])
  const [input, setInput] = useState('')
  const [found, setFound] = useState([])

  function submit(event) {
    event.preventDefault()
    const word = normalize(input)
    if (!puzzle.answers.includes(word)) return showToast('Not made from this vault.', 'error')
    if (found.includes(word)) return showToast('Already scored.', 'info')
    const nextFound = [...found, word]
    setFound(nextFound)
    setInput('')
    if (nextFound.length >= puzzle.answers.length) finishGame(onComplete, level, scoreFor(nextFound, 150))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={scoreFor(found)} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Make words from</p><strong className="big-letter compact-word">{puzzle.source}</strong><p>{found.length}/{puzzle.answers.length}</p></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
      <div className="found-words">{found.map((word) => <span className="found-word-chip" key={word}>{word}</span>)}</div>
    </div>
  )
}

function WordMaze({ level, onComplete, showToast }) {
  const words = useMemo(() => pickWordEntries(level, 4, { minLength: 4, maxLength: 6 }).map(({ word }) => word), [level])
  const [index, setIndex] = useState(0)
  const [path, setPath] = useState([])
  const target = words[index]
  const grid = useMemo(() => {
    const cells = Array.from({ length: 25 }, (_, cellIndex) => ALPHABET[(cellIndex * 5 + level) % 26])
    target.split('').forEach((letter, letterIndex) => { cells[letterIndex * 5] = letter })
    return cells
  }, [level, target])
  const current = path.map((cell) => grid[cell]).join('')

  function choose(cell) {
    if (path.includes(cell)) return
    const nextPath = [...path, cell]
    const nextWord = nextPath.map((item) => grid[item]).join('')
    if (!target.startsWith(nextWord)) {
      setPath([])
      return showToast('Wrong turn.', 'error')
    }
    setPath(nextPath)
    if (nextWord === target) {
      setPath([])
      if (index + 1 >= words.length) finishGame(onComplete, level, scoreFor(words, 160))
      else setIndex(index + 1)
    }
  }

  return (
    <div className="game-panel">
      <ScoreBar score={index * 120} xp={getXPForLevel(level)} />
      <div className="status-row"><span className="neutral-status">Target</span><strong>{target}</strong><span>{current}</span></div>
      <div className="word-maze-grid">
        {grid.map((letter, cell) => <button className={`word-search-cell ${path.includes(cell) ? 'selected' : ''}`} key={cell} onClick={() => choose(cell)}>{letter}</button>)}
      </div>
    </div>
  )
}

function RhymeTime({ level, onComplete, showToast }) {
  const group = RHYME_GROUPS[(level - 1) % RHYME_GROUPS.length]
  const [input, setInput] = useState('')
  const [found, setFound] = useState([])

  function submit(event) {
    event.preventDefault()
    const word = normalize(input)
    if (!word.endsWith(group.ending) || !isValidWord(word)) return showToast(`Find words ending ${group.ending.toUpperCase()}.`, 'error')
    if (found.includes(word)) return showToast('Already rhymed.', 'info')
    const nextFound = [...found, word]
    setFound(nextFound)
    setInput('')
    if (nextFound.length >= 4) finishGame(onComplete, level, scoreFor(nextFound, 100))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={scoreFor(found)} xp={getXPForLevel(level)} />
      <section className="prompt-card"><p>Rhyme with</p><strong className="big-letter compact-word">{group.clue}</strong></section>
      <TextAnswer value={input} onChange={setInput} onSubmit={submit} />
      <div className="found-words">{found.map((word) => <span className="found-word-chip" key={word}>{word}</span>)}</div>
    </div>
  )
}

export {
  AnagramBattle,
  CategoryRush,
  CipherWords,
  CrosswordDaily,
  DefinitionDuel,
  MissingLetter,
  QuoteFill,
  RhymeTime,
  SpellingBee,
  SynonymMatch,
  TypingSprint,
  WordLadder,
  WordMaze,
  WordSearch,
  WordSort,
}
