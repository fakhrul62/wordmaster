import { useEffect, useMemo, useState } from 'react'
import { triggerHaptic } from '../utils/haptics'
import { getCategoryForDifficulty, getDifficultyForLevel, getXPForLevel, getWordsByCategory, shuffle } from '../utils/wordUtils'
import { pickUnusedWords } from '../utils/uniqueWords'

function scramble(word) {
  let letters = shuffle(word.split(''))
  if (letters.join('') === word) letters = [...letters.slice(1), letters[0]]
  return letters.map((letter, index) => ({ letter, id: `${index}-${letter}` }))
}

function AnagramVault({ level, onComplete, showToast, hapticsEnabled = true }) {
  const wordCount = 3 + Math.floor(level / 2)
  const timeLimit = Math.max(30, 90 - level * 2)
  const words = useMemo(() => {
    const category = getCategoryForDifficulty(getDifficultyForLevel(level))
    const pool = getWordsByCategory(category).filter(({ length }) => length >= 4 && length <= 8)
    return pickUnusedWords(pool, wordCount, ({ word }) => word)
  }, [level, wordCount])
  const [wordIndex, setWordIndex] = useState(0)
  const current = words[wordIndex] || words[0]
  const [tiles, setTiles] = useState(() => scramble(current?.word || ''))
  const [selected, setSelected] = useState([])
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [score, setScore] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const visibility = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [])

  useEffect(() => {
    if (paused) return undefined
    const timer = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time > 1) return time - 1
        showToast('The vault reset. Try a new sequence.', 'error')
        setWordIndex(0)
        setScore(0)
        setSelected([])
        setTiles(scramble(words[0]?.word || ''))
        return timeLimit
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [paused, showToast, timeLimit, words])

  useEffect(() => {
    function keyboard(event) {
      if (event.key === 'Backspace') {
        setSelected((items) => items.slice(0, -1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        document.querySelector('[data-anagram-submit]')?.click()
        return
      }
      if (!/^[a-z]$/i.test(event.key)) return
      setSelected((items) => {
        const used = new Set(items.map(({ id }) => id))
        const tile = tiles.find(({ id, letter }) => !used.has(id) && letter === event.key.toLowerCase())
        return tile ? [...items, tile] : items
      })
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  }, [tiles])

  function choose(tile) {
    setSelected((items) => {
      triggerHaptic(hapticsEnabled)
      return items.some(({ id }) => id === tile.id)
        ? items.filter(({ id }) => id !== tile.id)
        : [...items, tile]
    })
  }

  function submit() {
    const answer = selected.map(({ letter }) => letter).join('')
    if (answer !== current.word) return showToast('That combination does not unlock it.', 'error')
    const nextScore = score + current.word.length * 20 + timeLeft
    if (wordIndex + 1 >= words.length) {
      onComplete(nextScore, getXPForLevel(level), level + 1)
      return
    }
    const nextIndex = wordIndex + 1
    setScore(nextScore)
    setWordIndex(nextIndex)
    setSelected([])
    setTiles(scramble(words[nextIndex].word))
    showToast('Vault opened!', 'success')
  }

  function hint() {
    const nextLetter = current.word[selected.length]
    const used = new Set(selected.map(({ id }) => id))
    const tile = tiles.find(({ id, letter }) => !used.has(id) && letter === nextLetter)
    if (tile) setSelected((items) => [...items, tile])
    setScore((value) => Math.max(0, value - 5))
  }

  if (!current) {
    return <div className="game-panel"><p className="empty-state">No fresh vault words available.</p></div>
  }

  return (
    <div className="game-panel">
      <div className="anagram-head">
        <div><p className="eyebrow">Vault sequence</p><strong>{wordIndex + 1} / {words.length}</strong></div>
        <svg className="timer-ring" width="64" height="64" viewBox="0 0 80 80" aria-label={`${timeLeft} seconds remaining`}>
          <circle cx="40" cy="40" r="36" fill="none" stroke="var(--bg3)" strokeWidth="6" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={timeLeft < 10 ? 'var(--error)' : 'var(--accent)'} strokeWidth="6"
            strokeDasharray="226.2" strokeDashoffset={226.2 * (1 - timeLeft / timeLimit)} strokeLinecap="round"
            transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          <text x="40" y="46" textAnchor="middle" fill="var(--text)" fontSize="18">{timeLeft}</text>
        </svg>
      </div>
      <section className="puzzle-card">
        <div><p className="puzzle-label">Scrambled letters</p>
          <div className="tile-row">
            {tiles.map((tile) => (
              <button className={`tile ${selected.some(({ id }) => id === tile.id) ? 'selected' : ''}`} key={tile.id}
                onClick={() => choose(tile)}>{tile.letter}</button>
            ))}
          </div>
        </div>
        <div><p className="puzzle-label">Your answer</p>
          <div className="answer-slots">
            {Array.from({ length: current.word.length }, (_, index) => (
              <button
                className="tile answer-slot"
                key={index}
                onClick={() => {
                  if (selected[index]) triggerHaptic(hapticsEnabled)
                  setSelected((items) => items.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                {selected[index]?.letter || ''}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="button-grid">
        <button className="btn-secondary" onClick={() => setSelected([])}>CLEAR</button>
        <button className="btn-secondary" onClick={hint}>HINT −5</button>
        <button className="btn-primary full-span" data-anagram-submit onClick={submit}>SUBMIT</button>
      </div>
      <p className="definition-hint">{current.definition}</p>
    </div>
  )
}

export default AnagramVault
