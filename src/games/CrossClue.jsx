import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CROSSCLUE_GRIDS, getDifficultyForLevel, getXPForLevel } from '../utils/wordUtils'

function getGridForLevel(level) {
  const map = { easy: 'easy', medium: 'easy', hard: 'medium', expert: 'hard' }
  const pool = CROSSCLUE_GRIDS.filter(({ difficulty }) => difficulty === map[getDifficultyForLevel(level)])
  return pool[(level - 1) % pool.length]
}

function CrossClue({ level, onComplete, showToast }) {
  const grid = useMemo(() => getGridForLevel(level), [level])
  const [answers, setAnswers] = useState({})
  const [activeIndex, setActiveIndex] = useState(0)
  const [cursor, setCursor] = useState(0)
  const hiddenInput = useRef(null)
  const active = grid.entries[activeIndex]
  const cellSize = Math.max(36, Math.floor((Math.min(window.innerWidth, 480) - 32) / grid.gridSize))

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
    setActiveIndex(entryIndex)
    setCursor(nextCursor)
    window.setTimeout(() => hiddenInput.current?.focus(), 0)
  }

  const typeLetter = useCallback((letter) => {
    if (!/^[a-z]$/i.test(letter)) return
    const currentAnswer = (answers[activeIndex] || '').padEnd(active.word.length, ' ')
    const nextAnswer = `${currentAnswer.slice(0, cursor)}${letter.toLowerCase()}${currentAnswer.slice(cursor + 1)}`.trimEnd()
    const nextAnswers = { ...answers, [activeIndex]: nextAnswer }
    setAnswers(nextAnswers)
    setCursor(Math.min(active.word.length - 1, cursor + 1))
    const complete = grid.entries.every((entry, index) => nextAnswers[index] === entry.word)
    if (complete) onComplete(grid.entries.length * 100, getXPForLevel(level), level + 1)
  }, [active.word.length, activeIndex, answers, cursor, grid.entries, level, onComplete])

  const erase = useCallback(() => {
    const currentAnswer = (answers[activeIndex] || '').padEnd(active.word.length, ' ')
    const target = currentAnswer[cursor] ? cursor : Math.max(0, cursor - 1)
    setAnswers({ ...answers, [activeIndex]: `${currentAnswer.slice(0, target)} ${currentAnswer.slice(target + 1)}`.trimEnd() })
    setCursor(target)
  }, [active.word.length, activeIndex, answers, cursor])

  useEffect(() => {
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
                selectEntry(position.entryIndex, position.index)
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
        value=""
        onChange={() => {}}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && answers[activeIndex] !== active.word) showToast('That answer is not complete yet.', 'error')
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
