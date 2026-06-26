import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { triggerHaptic } from '../utils/haptics'
import { getXPForLevel } from '../utils/wordUtils'
import { buildDynamicCrossword } from '../utils/crosswordUtils'

function CrossClue({ level, onComplete, showToast, hapticsEnabled = true }) {
  const grid = useMemo(() => buildDynamicCrossword(level), [level])
  const [answers, setAnswers] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [, setCursor] = useState(0)
  const hiddenInput = useRef(null)
  const answersRef = useRef({})
  const activeIndexRef = useRef(0)
  const cursorRef = useRef(0)
  const active = grid.entries[activeIndex]
  const crosswordWidth = window.innerWidth >= 1180
    ? Math.min(window.innerWidth * 0.42, 640)
    : Math.min(window.innerWidth, 480)
  const cellSize = Math.max(36, Math.floor((crosswordWidth - 32) / grid.gridSize))

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

  const typeLetter = useCallback((letter) => {
    if (!/^[a-z]$/i.test(letter)) return
    triggerHaptic(hapticsEnabled)
    const entryIndex = activeIndexRef.current
    const position = cursorRef.current
    const entry = grid.entries[entryIndex]
    if (!entry) return
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
    const complete = grid.entries.every((entry, index) => nextAnswers[index] === entry.word)
    if (complete) onComplete(grid.entries.length * 100, getXPForLevel(level), level + 1)
  }, [cells, grid.entries, hapticsEnabled, level, onComplete])

  const erase = useCallback(() => {
    triggerHaptic(hapticsEnabled)
    const entryIndex = activeIndexRef.current
    const entry = grid.entries[entryIndex]
    if (!entry) return
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

  function cellValue(cell) {
    for (const position of cell.entries) {
      const value = answers[position.entryIndex]?.[position.index]
      if (value && value !== ' ') return value
    }
    return ''
  }

  if (!active) {
    return <div className="game-panel"><p className="empty-state">No fresh crossword words available.</p></div>
  }

  return (
    <div className="game-panel crossclue-panel">
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
                if (sameCell && cellValue(cell)) {
                  erase()
                } else {
                  selectEntry(position.entryIndex, position.index)
                }
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
            erase()
          } else if (event.key === 'Enter' && active && answers[activeIndex] !== active.word) showToast('That answer is not complete yet.', 'error')
        }}
        aria-label="Crossword letter input"
      />
      <section className="active-clue">
        <p className="eyebrow">Selected: {active.clueNumber}-{active.direction === 'across' ? 'Across' : 'Down'}</p>
        <h2>{active.definition}</h2>
        <p>{active.word.length} letters</p>
      </section>
      <section className="clue-panel">
        <div className="panel-title"><span>Clues</span><small>Tap to select</small></div>
        <div className="clue-list">
          {grid.entries.map((entry, index) => (
            <button className={index === activeIndex ? 'selected' : ''} key={`${entry.clueNumber}-${entry.direction}`}
              onClick={() => selectEntry(index)}>
              <strong>{entry.clueNumber}{entry.direction[0].toUpperCase()}</strong>
              <span>{entry.definition}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default CrossClue
