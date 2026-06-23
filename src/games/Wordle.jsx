import { useEffect, useMemo, useState } from 'react'
import { VALID_WORDS, shuffle } from '../utils/wordUtils'

const LENGTHS = [3, 4, 5, 6]
const MAX_ATTEMPTS = 6
const ROWS = Array.from({ length: MAX_ATTEMPTS })
const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const RANK = { absent: 1, present: 2, correct: 3 }
const FALLBACK_WORDS = { 3: 'cat', 4: 'word', 5: 'crane', 6: 'planet' }

function pickWord(length) {
  const pool = VALID_WORDS.filter((word) => word.length === length)
  return shuffle(pool)[0] || FALLBACK_WORDS[length]
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

function Wordle({ showToast }) {
  const [wordLength, setWordLength] = useState(null)
  const [answer, setAnswer] = useState('')
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState('playing')

  const keyStates = useMemo(() => guesses.reduce((states, guess) => {
    scoreGuess(guess, answer).forEach((state, index) => {
      const letter = guess[index]
      if (!states[letter] || RANK[state] > RANK[states[letter]]) states[letter] = state
    })
    return states
  }, {}), [answer, guesses])

  function start(length) {
    setWordLength(length)
    setAnswer(pickWord(length))
    setGuesses([])
    setCurrent('')
    setStatus('playing')
  }

  function reset() {
    setWordLength(null)
    setAnswer('')
    setGuesses([])
    setCurrent('')
    setStatus('playing')
  }

  function addLetter(letter) {
    if (status !== 'playing' || !wordLength) return
    setCurrent((value) => value.length < wordLength ? `${value}${letter}` : value)
  }

  function removeLetter() {
    if (status === 'playing') setCurrent((value) => value.slice(0, -1))
  }

  function submit() {
    if (status !== 'playing' || !wordLength) return
    if (current.length !== wordLength) {
      showToast(`Enter a ${wordLength}-letter word.`, 'error')
      return
    }
    const nextGuesses = [...guesses, current]
    setGuesses(nextGuesses)
    setCurrent('')
    if (current === answer) {
      setStatus('won')
      showToast('All green. Nicely solved.', 'success')
      return
    }
    if (nextGuesses.length >= MAX_ATTEMPTS) {
      setStatus('lost')
      showToast(`The word was ${answer.toUpperCase()}.`, 'error')
    }
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (!wordLength) return
      if (event.key === 'Enter') {
        event.preventDefault()
        submit()
        return
      }
      if (event.key === 'Backspace') {
        removeLetter()
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

  return (
    <div className="game-panel wordle-panel">
      <div className="status-row">
        <span className="neutral-status">{wordLength} letters</span>
        <strong>{guesses.length}/{MAX_ATTEMPTS}</strong>
      </div>
      <section className="wordle-board" style={{ width: `min(100%, ${wordLength * 46 + (wordLength - 1) * 6}px)` }} aria-label="Wordle guesses">
        {ROWS.map((_, rowIndex) => {
          const guess = guesses[rowIndex]
          const letters = guess || (rowIndex === guesses.length ? current : '')
          const states = guess ? scoreGuess(guess, answer) : []
          return (
            <div className="wordle-row" style={{ gridTemplateColumns: `repeat(${wordLength}, 1fr)` }} key={rowIndex}>
              {Array.from({ length: wordLength }, (__, index) => (
                <span className={`wordle-tile ${states[index] || ''}`} key={index}>{letters[index] || ''}</span>
              ))}
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
      <section className="wordle-keyboard" aria-label="Keyboard">
        {KEYS.map((row) => (
          <div className="wordle-key-row" key={row}>
            {row === 'zxcvbnm' && <button className="wordle-key wide" onClick={submit}>ENTER</button>}
            {row.split('').map((letter) => (
              <button className={`wordle-key ${keyStates[letter] || ''}`} key={letter} onClick={() => addLetter(letter)}>{letter}</button>
            ))}
            {row === 'zxcvbnm' && <button className="wordle-key wide" onClick={removeLetter}>⌫</button>}
          </div>
        ))}
      </section>
    </div>
  )
}

export default Wordle
