import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { triggerHaptic } from '../utils/haptics'
import { getXPForLevel } from '../utils/wordUtils'
import { hasUsedWord, rememberWord } from '../utils/uniqueWords'

const BOARD_SIZE = 4
const LETTERS = 'eeeeeeeeeeeeaaaaaaaaaiiiiiiiiioooooooonnnnnnrrrrrrttttttllllssssuuuuddggbbccmmppffhhvvwwyykjxqz'

const scoreWord = (word) => {
  if (word.length === 3) return 1
  if (word.length === 4) return 2
  if (word.length === 5) return 4
  if (word.length === 6) return 6
  return 10
}

const makeBoard = () =>
  Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, index) => ({
    id: index,
    letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE,
  }))

async function isDictionaryWord(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
  return response.ok
}

function Boggle({ level, minimumLength = 3, onComplete, showToast, hapticsEnabled = true }) {
  const modeLength = Number(minimumLength) || 3
  const [board, setBoard] = useState(() => makeBoard())
  const [path, setPath] = useState([])
  const [found, setFound] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [validating, setValidating] = useState(false)
  const [expired, setExpired] = useState(false)
  const startedAt = useRef(Date.now())

  const selectedIds = useMemo(() => new Set(path.map(({ id }) => id)), [path])
  const currentWord = path.map(({ letter }) => letter).join('')
  const score = found.reduce((total, word) => total + scoreWord(word), 0)
  const targetScore = 10 + (level - 1) * 5

  const reset = useCallback(() => {
    setBoard(makeBoard())
    setPath([])
    setFound([])
    setExpired(false)
    setValidating(false)
    startedAt.current = Date.now()
  }, [])

  function selectTile(tile, allowToggle = true) {
    if (expired) return
    setPath((items) => {
      if (items.at(-1)?.id === tile.id) {
        if (!allowToggle) return items
        triggerHaptic(hapticsEnabled)
        return items.slice(0, -1)
      }
      if (items.some(({ id }) => id === tile.id)) return items
      triggerHaptic(hapticsEnabled)
      return [...items, tile]
    })
  }

  function tileFromPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY)?.closest('[data-boggle-id]')
    if (!element) return null
    return board.find(({ id }) => id === Number(element.dataset.boggleId)) || null
  }

  async function submit() {
    const word = currentWord.toLowerCase()
    if (expired || validating || !word) return
    if (word.length < modeLength) {
      setPath([])
      showToast(`Minimum length is ${modeLength}.`, 'error')
      return
    }
    if (found.includes(word)) {
      setPath([])
      return
    }
    if (hasUsedWord(word)) {
      setPath([])
      showToast('That word was already used in another puzzle.', 'error')
      return
    }
    setValidating(true)
    try {
      if (await isDictionaryWord(word)) {
        rememberWord(word)
        const wordScore = scoreWord(word)
        setFound((words) => {
          const nextWords = [word, ...words]
          const nextScore = nextWords.reduce((total, entry) => total + scoreWord(entry), 0)
          if (nextScore >= targetScore) {
            const completionTime = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
            setExpired(true)
            window.setTimeout(() => onComplete(nextScore, getXPForLevel(level), level + 1, { completionTime }), 0)
          }
          return nextWords
        })
        showToast(`+${wordScore} ${word.toUpperCase()}`, 'success')
      } else {
        showToast('Not in the dictionary.', 'error')
      }
    } catch {
      showToast('Dictionary check failed. Try again.', 'error')
    } finally {
      setPath([])
      setValidating(false)
    }
  }

  useEffect(() => {
    reset()
  }, [level, modeLength, reset])

  return (
    <div className="game-panel">
      <div className="status-row">
        <span className="neutral-status">Min {modeLength}</span>
        <strong>{found.length} words</strong>
        <span>{score}/{targetScore} pts</span>
      </div>
      <section
        className={`boggle-board ${expired ? 'frozen' : ''}`}
        onMouseLeave={() => setIsDragging(false)}
        onMouseUp={() => setIsDragging(false)}
        onTouchEnd={() => setIsDragging(false)}
        aria-label="Boggle board"
      >
        {board.map((tile) => (
          <button
            className={`boggle-tile ${selectedIds.has(tile.id) ? 'selected' : ''}`}
            data-boggle-id={tile.id}
            disabled={expired}
            key={tile.id}
            onMouseDown={() => { setIsDragging(true); selectTile(tile) }}
            onMouseEnter={() => { if (isDragging) selectTile(tile, false) }}
            onTouchStart={(event) => { setIsDragging(true); selectTile(tile); event.preventDefault() }}
            onTouchMove={(event) => {
              const touch = event.touches[0]
              const nextTile = tileFromPoint(touch.clientX, touch.clientY)
              if (nextTile) selectTile(nextTile, false)
              event.preventDefault()
            }}
          >
            {tile.letter}
          </button>
        ))}
      </section>
      <section className="boggle-wordbar">
        <strong>{currentWord || (expired ? 'Level clear' : 'Trace a word')}</strong>
        <div className="button-grid boggle-actions">
          <button className="btn-secondary" onClick={() => setPath([])} disabled={expired || !path.length}>CLEAR</button>
          <button className="btn-primary" onClick={submit} disabled={expired || validating || !path.length}>
            {validating ? 'CHECKING...' : 'SUBMIT'}
          </button>
        </div>
      </section>
      {expired && (
        <section className="result-panel">
          <p className="eyebrow">Final score</p>
          <strong>{score}</strong>
          <button className="btn-primary" onClick={reset}>PLAY AGAIN</button>
        </section>
      )}
      <section className="history-panel">
        <div className="panel-title"><span>Found words</span><small>{found.length}</small></div>
        <div className="chain-list">
          {found.length ? found.map((word) => (
            <span className="word-chip" key={word}>{word} +{scoreWord(word)}</span>
          )) : <p className="empty-state">Accepted words will appear here.</p>}
        </div>
      </section>
    </div>
  )
}

export default Boggle
