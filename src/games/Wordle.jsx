import { useEffect, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { triggerHaptic } from '../utils/haptics'
import { getWordleAnswerCandidates, getXPForLevel, isValidWord } from '../utils/wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from '../utils/uniqueWords'

const LENGTHS = [3, 4, 5, 6]
const MAX_ATTEMPTS = 6
const ROWS = Array.from({ length: MAX_ATTEMPTS })
const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

function pickWord(length) {
  const pool = getWordleAnswerCandidates(length)
  return pickUnusedWord(pool) || ''
}

function scoreGuess(guess, answer) {
  const result = Array.from({ length: guess.length }, () => 'absent')
  const remaining = {}
  answer.split('').forEach((letter, index) => {
    if (guess[index] === letter) {
      result[index] = 'correct'
      return
    }
    remaining[letter] = (remaining[letter] || 0) + 1
  })
  guess.split('').forEach((letter, index) => {
    if (result[index] === 'correct' || !remaining[letter]) return
    result[index] = 'present'
    remaining[letter] -= 1
  })
  return result
}

function getWinScore(wordLength, guessCount) {
  const speedBonus = (MAX_ATTEMPTS - guessCount + 1) * 25
  return wordLength * 50 + speedBonus
}

function getTargetScore(level, wordLength) {
  return wordLength * 50 + Math.min(100, Math.floor((level - 1) * 8))
}

function Wordle({ level, onComplete, showToast, hapticsEnabled = true }) {
  const [wordLength, setWordLength] = useState(null)
  const [answer, setAnswer] = useState('')
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState('playing')
  const [score, setScore] = useState(0)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  function start(length) {
    const nextAnswer = pickWord(length)
    if (!nextAnswer) {
      showToast('No word available for this length.', 'error')
      return
    }
    setWordLength(length)
    setAnswer(nextAnswer)
    setGuesses([])
    setCurrent('')
    setStatus('playing')
    setScore(0)
  }

  function reset() {
    setWordLength(null)
    setAnswer('')
    setGuesses([])
    setCurrent('')
    setStatus('playing')
    setScore(0)
  }

  function addLetter(letter) {
    if (status !== 'playing' || !wordLength) return
    setCurrent((previous) => {
      if (previous.length >= wordLength) return previous
      triggerHaptic(hapticsEnabled)
      return `${previous}${letter}`
    })
  }

  function removeLetterAt(index) {
    if (status !== 'playing') return
    triggerHaptic(hapticsEnabled)
    setCurrent((value) => `${value.slice(0, index)}${value.slice(index + 1)}`)
  }

  function removeLastLetter() {
    if (status !== 'playing') return
    setCurrent((value) => {
      if (!value) return value
      triggerHaptic(hapticsEnabled)
      return value.slice(0, -1)
    })
  }

  function submit() {
    if (status !== 'playing' || !wordLength) return
    if (current.length !== wordLength) {
      showToast(`Enter a ${wordLength}-letter word.`, 'error')
      return
    }
    if (!isValidWord(current)) {
      showToast(`'${current.toUpperCase()}' is not in the word list.`, 'error')
      return
    }
    if (current !== answer && hasUsedWord(current)) {
      showToast(`'${current.toUpperCase()}' was already used in another puzzle.`, 'error')
      return
    }
    rememberWord(current)
    const nextGuesses = [...guesses, current]
    setGuesses(nextGuesses)
    setCurrent('')
    if (current === answer) {
      const nextScore = getWinScore(wordLength, nextGuesses.length)
      const targetScore = getTargetScore(level, wordLength)
      setScore(nextScore)
      setStatus('won')
      if (nextScore >= targetScore) {
        showToast('All green. Level cleared.', 'success')
        onComplete(nextScore, getXPForLevel(level), level + 1)
      } else {
        showToast(`Solved, but you need ${targetScore} points to level up.`, 'info')
      }
      return
    }
    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setStatus('lost')
      showToast(`The word was ${answer.toUpperCase()}.`, 'error')
    }
  }

  useEffect(() => {
    function resize() {
      const visualViewport = window.visualViewport
      setViewport({
        width: visualViewport?.width || window.innerWidth,
        height: visualViewport?.height || window.innerHeight,
      })
    }
    resize()
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event) {
      if (!wordLength) return
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        removeLastLetter()
        return
      }
      if (/^[a-z]$/i.test(event.key)) addLetter(event.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!wordLength) {
    return (
      <div className="game-panel">
        <section className="choice-panel">
          <p className="eyebrow">Wordle</p>
          <h1>Pick word length</h1>
          <div className="length-options">
            {LENGTHS.map((length) => (
              <button className="btn-secondary" key={length} onClick={() => start(length)}>{length}</button>
            ))}
          </div>
        </section>
      </div>
    )
  }

  const gap = 6
  const keyboardHeight = Math.floor(Math.max(188, Math.min(238, viewport.height * 0.25)))
  const submitHeight = Math.max(46, Math.min(54, Math.floor(viewport.height * 0.055)))
  const reservedHeight = keyboardHeight + submitHeight + 252
  const maxTileSize = wordLength <= 3 ? 132 : wordLength === 4 ? 104 : 88
  const tileSize = Math.floor(Math.max(42, Math.min(
    maxTileSize,
    (viewport.width - 32 - (wordLength - 1) * gap) / wordLength,
    (viewport.height - reservedHeight - (MAX_ATTEMPTS - 1) * gap) / MAX_ATTEMPTS,
  )))
  const keyHeight = Math.floor((keyboardHeight - submitHeight - 28) / 3)
  const targetScore = getTargetScore(level, wordLength)

  return (
    <div className="game-panel wordle-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <div className="status-row">
        <span className="neutral-status">{wordLength} letters</span>
        <strong>{guesses.length}/{MAX_ATTEMPTS}</strong>
        <span>{score}/{targetScore} pts</span>
      </div>
      <section
        className="wordle-board"
        style={{ '--wordle-tile': `${tileSize}px`, '--wordle-gap': `${gap}px` }}
        aria-label="Wordle guesses"
      >
        {ROWS.map((_, rowIndex) => {
          const guess = guesses[rowIndex]
          const letters = guess || (rowIndex === guesses.length ? current : '')
          const states = guess ? scoreGuess(guess, answer) : []
          return (
            <div className="wordle-row" style={{ gridTemplateColumns: `repeat(${wordLength}, 1fr)` }} key={rowIndex}>
              {Array.from({ length: wordLength }, (__, index) => {
                const letter = letters[index] || ''
                const isEditableLetter = !guess && letter
                return isEditableLetter ? (
                  <button className="wordle-tile editable" key={index} onClick={() => removeLetterAt(index)}>{letter}</button>
                ) : (
                  <span className={`wordle-tile ${states[index] || ''}`} key={index}>{letter}</span>
                )
              })}
            </div>
          )
        })}
      </section>
      {status !== 'playing' && (
        <section className="result-panel">
          <p className="eyebrow">{status === 'won' ? 'Win' : 'Game over'}</p>
          <strong>{answer.toUpperCase()}</strong>
          <button className="btn-primary" onClick={reset}>NEW GAME</button>
        </section>
      )}
      <section
        className="wordle-keyboard"
        style={{
          '--wordle-key-height': `${keyHeight}px`,
          '--wordle-submit-height': `${submitHeight}px`,
        }}
        aria-label="Keyboard"
      >
        {KEYS.map((row) => (
          <div className="wordle-key-row" key={row}>
            {row.split('').map((letter) => (
              <button className="wordle-key" key={letter} onClick={() => addLetter(letter)}>{letter}</button>
            ))}
            {row === 'zxcvbnm' && (
              <button className="wordle-key wide wordle-backspace" onClick={removeLastLetter} aria-label="Delete last letter">⌫</button>
            )}
          </div>
        ))}
        <button className="btn-primary wordle-submit" onClick={submit}>SUBMIT</button>
      </section>
    </div>
  )
}

export default Wordle
