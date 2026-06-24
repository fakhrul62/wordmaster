import { useEffect, useState } from 'react'
import { triggerHaptic } from '../utils/haptics'
import { getWordleAnswerCandidates, isValidWord, shuffle } from '../utils/wordUtils'

const LENGTHS = [3, 4, 5, 6]
const MAX_ATTEMPTS = 6
const ROWS = Array.from({ length: MAX_ATTEMPTS })
const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
const FALLBACK_WORDS = { 3: 'cat', 4: 'word', 5: 'crane', 6: 'planet' }

function pickWord(length) {
  const pool = getWordleAnswerCandidates(length)
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

function Wordle({ showToast, hapticsEnabled = true }) {
  const [wordLength, setWordLength] = useState(null)
  const [answer, setAnswer] = useState('')
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState('playing')
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

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
        setCurrent((value) => value.slice(0, -1))
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
  const keyboardHeight = Math.floor(Math.max(150, Math.min(230, viewport.height * 0.24)))
  const maxTileSize = wordLength <= 3 ? 132 : wordLength === 4 ? 104 : 88
  const tileSize = Math.floor(Math.max(42, Math.min(
    maxTileSize,
    (viewport.width - 32 - (wordLength - 1) * gap) / wordLength,
    (viewport.height - keyboardHeight - 184 - (MAX_ATTEMPTS - 1) * gap) / MAX_ATTEMPTS,
  )))
  const keyHeight = Math.floor((keyboardHeight - 16) / 3)

  return (
    <div className="game-panel wordle-panel">
      <div className="status-row">
        <span className="neutral-status">{wordLength} letters</span>
        <strong>{guesses.length}/{MAX_ATTEMPTS}</strong>
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
      <section className="wordle-keyboard" style={{ '--wordle-key-height': `${keyHeight}px` }} aria-label="Keyboard">
        {KEYS.map((row) => (
          <div className="wordle-key-row" key={row}>
            {row === 'zxcvbnm' && (
              <button className="wordle-key wide wordle-submit" onClick={submit} aria-label="Submit guess">↵</button>
            )}
            {row.split('').map((letter) => (
              <button className="wordle-key" key={letter} onClick={() => addLetter(letter)}>{letter}</button>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}

export default Wordle
