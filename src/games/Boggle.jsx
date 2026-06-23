import { useEffect, useMemo, useState } from 'react'

const LENGTHS = [3, 4, 5, 6]
const BOARD_SIZE = 4
const GAME_TIME = 120
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

function Boggle({ showToast }) {
  const [minimumLength, setMinimumLength] = useState(null)
  const [board, setBoard] = useState([])
  const [path, setPath] = useState([])
  const [found, setFound] = useState([])
  const [timeLeft, setTimeLeft] = useState(GAME_TIME)
  const [isDragging, setIsDragging] = useState(false)
  const [validating, setValidating] = useState(false)
  const [expired, setExpired] = useState(false)

  const selectedIds = useMemo(() => new Set(path.map(({ id }) => id)), [path])
  const currentWord = path.map(({ letter }) => letter).join('')
  const score = found.reduce((total, word) => total + scoreWord(word), 0)

  function start(length) {
    setMinimumLength(length)
    setBoard(makeBoard())
    setPath([])
    setFound([])
    setTimeLeft(GAME_TIME)
    setExpired(false)
    setValidating(false)
  }

  function reset() {
    setMinimumLength(null)
    setBoard([])
    setPath([])
    setFound([])
    setTimeLeft(GAME_TIME)
    setExpired(false)
  }

  function selectTile(tile) {
    if (expired) return
    setPath((items) => {
      if (items.some(({ id }) => id === tile.id)) return items
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
    if (word.length < minimumLength) {
      setPath([])
      showToast(`Minimum length is ${minimumLength}.`, 'error')
      return
    }
    if (found.includes(word)) {
      setPath([])
      return
    }
    setValidating(true)
    try {
      if (await isDictionaryWord(word)) {
        setFound((words) => [word, ...words])
        showToast(`+${scoreWord(word)} ${word.toUpperCase()}`, 'success')
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
    if (!minimumLength || expired) return undefined
    const timer = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time > 1) return time - 1
        setExpired(true)
        setPath([])
        return 0
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [expired, minimumLength])

  if (!minimumLength) {
    return (
      <div className="game-panel">
        <section className="choice-panel">
          <p className="eyebrow">Boggle</p>
          <h1>Pick minimum length</h1>
          <div className="length-options">
            {LENGTHS.map((length) => (
              <button className="btn-secondary" key={length} onClick={() => start(length)}>{length}</button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="game-panel">
      <div className="status-row">
        <span className="neutral-status">Min {minimumLength}</span>
        <strong>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</strong>
        <span>{score} pts</span>
      </div>
      <div className="timer-track" aria-label={`${timeLeft} seconds remaining`}>
        <span style={{ width: `${(timeLeft / GAME_TIME) * 100}%` }} />
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
            onMouseEnter={() => { if (isDragging) selectTile(tile) }}
            onClick={() => selectTile(tile)}
            onTouchStart={(event) => { setIsDragging(true); selectTile(tile); event.preventDefault() }}
            onTouchMove={(event) => {
              const touch = event.touches[0]
              const nextTile = tileFromPoint(touch.clientX, touch.clientY)
              if (nextTile) selectTile(nextTile)
              event.preventDefault()
            }}
          >
            {tile.letter}
          </button>
        ))}
      </section>
      <section className="boggle-wordbar">
        <strong>{currentWord || (expired ? 'Time up' : 'Trace a word')}</strong>
        <div className="button-grid">
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
