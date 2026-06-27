import { useEffect, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { getWordleAnswerCandidates, getXPForLevel, isValidWord } from '../utils/wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from '../utils/uniqueWords'

const KEYS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const DIFFICULTY_RULES = {
  easy: { length: 5, attempts: 8 },
  normal: { length: 5, attempts: 6 },
  hard: { length: 6, attempts: 5 },
}

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
  const speedBonus = Math.max(0, (8 - guessCount + 1) * 25)
  return wordLength * 50 + speedBonus
}

function getTargetScore(level, wordLength) {
  return wordLength * 50 + Math.min(100, Math.floor((level - 1) * 8))
}

function Wordle({
  level,
  onComplete,
  showToast,
  hapticsEnabled = true,
  soundEnabled = true,
  difficulty = 'normal',
  xpMultiplier = 1,
  streakMultiplier = 1,
  player = null,
  hintRequest = 0,
}) {
  const rules = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.normal
  const [wordLength, setWordLength] = useState(null)
  const [maxAttempts, setMaxAttempts] = useState(rules.attempts)
  const [answer, setAnswer] = useState('')
  const [guesses, setGuesses] = useState([])
  const [current, setCurrent] = useState('')
  const [revealed, setRevealed] = useState([])
  const [status, setStatus] = useState('playing')
  const [score, setScore] = useState(0)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  function start(length = rules.length, attempts = rules.attempts) {
    const nextAnswer = pickWord(length)
    if (!nextAnswer) {
      showToast('No word available for this length.', 'error')
      playSound('wrong', soundEnabled)
      return
    }
    setWordLength(length)
    setMaxAttempts(attempts)
    setAnswer(nextAnswer)
    setGuesses([])
    setCurrent('')
    setRevealed([])
    setStatus('playing')
    setScore(0)
    playSound('key', soundEnabled)
  }

  function reset() {
    setWordLength(null)
    setMaxAttempts(rules.attempts)
    setAnswer('')
    setGuesses([])
    setCurrent('')
    setRevealed([])
    setStatus('playing')
    setScore(0)
  }

  function addLetter(letter) {
    if (status !== 'playing' || !wordLength) return
    setCurrent((previous) => {
      if (previous.length >= wordLength) return previous
      triggerHaptic(hapticsEnabled, 8)
      playSound('key', soundEnabled)
      return `${previous}${letter}`
    })
  }

  function removeLetterAt(index) {
    if (status !== 'playing') return
    triggerHaptic(hapticsEnabled, 8)
    playSound('key', soundEnabled)
    setCurrent((value) => `${value.slice(0, index)}${value.slice(index + 1)}`)
  }

  function removeLastLetter() {
    if (status !== 'playing') return
    setCurrent((value) => {
      if (!value) return value
      triggerHaptic(hapticsEnabled, 8)
      playSound('key', soundEnabled)
      return value.slice(0, -1)
    })
  }

  function submit() {
    if (status !== 'playing' || !wordLength) return
    if (current.length !== wordLength) {
      showToast(`Enter a ${wordLength}-letter word.`, 'error')
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      return
    }
    if (!isValidWord(current)) {
      showToast(`'${current.toUpperCase()}' is not in the word list.`, 'error')
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      return
    }
    if (current !== answer && hasUsedWord(current)) {
      showToast(`'${current.toUpperCase()}' was already used in another puzzle.`, 'error')
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
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
      playSound('correct', soundEnabled)
      triggerHaptic(hapticsEnabled, 18)
      if (nextScore >= targetScore) {
        showToast('All green. Level cleared.', 'success')
        onComplete(nextScore, getXPForLevel(level), level + 1)
      } else {
        showToast(`Solved, but you need ${targetScore} points to level up.`, 'info')
      }
      return
    }
    playSound('wrong', soundEnabled)
    triggerHaptic(hapticsEnabled, 40)
    if (nextGuesses.length >= maxAttempts) {
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
    start(rules.length, rules.attempts)
  }, [difficulty])

  useEffect(() => {
    if (!hintRequest || !answer) return
    const openIndexes = answer
      .split('')
      .map((letter, index) => ({ letter, index }))
      .filter(({ index }) => !revealed.includes(index) && current[index] !== answer[index])
    const next = openIndexes[0]
    if (!next) {
      showToast('Every revealed slot is already visible.', 'info')
      return
    }
    setRevealed((items) => [...items, next.index])
    showToast(`Hint: position ${next.index + 1} is ${next.letter.toUpperCase()}.`, 'success')
  }, [hintRequest])

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

  if (!wordLength) return null

  const gap = 6
  const keyboardHeight = Math.floor(Math.max(188, Math.min(238, viewport.height * 0.25)))
  const submitHeight = Math.max(46, Math.min(54, Math.floor(viewport.height * 0.055)))
  const reservedHeight = keyboardHeight + submitHeight + 252
  const maxTileSize = wordLength <= 3 ? 132 : wordLength === 4 ? 104 : 88
  const tileSize = Math.floor(Math.max(42, Math.min(
    maxTileSize,
    (viewport.width - 32 - (wordLength - 1) * gap) / wordLength,
    (viewport.height - reservedHeight - (maxAttempts - 1) * gap) / maxAttempts,
  )))
  const keyHeight = Math.floor((keyboardHeight - submitHeight - 28) / 3)
  const targetScore = getTargetScore(level, wordLength)

  return (
    <div className="game-panel wordle-panel">
      <ScoreBar
        score={score}
        xp={Math.round(getXPForLevel(level) * xpMultiplier)}
        xpMultiplier={xpMultiplier}
        streakMultiplier={streakMultiplier}
        streakCount={player?.streak?.count || 0}
      />
      <div className="status-row">
        <span className="neutral-status">{wordLength} letters · {difficulty}</span>
        <strong>{guesses.length}/{maxAttempts}</strong>
        <span>{score}/{targetScore} pts</span>
      </div>
      <section
        className="wordle-board"
        style={{ '--wordle-tile': `${tileSize}px`, '--wordle-gap': `${gap}px` }}
        aria-label="Wordle guesses"
      >
        {Array.from({ length: maxAttempts }).map((_, rowIndex) => {
          const guess = guesses[rowIndex]
          const letters = guess || (rowIndex === guesses.length ? current : '')
          const states = guess ? scoreGuess(guess, answer) : []
          return (
            <div className="wordle-row" style={{ gridTemplateColumns: `repeat(${wordLength}, 1fr)` }} key={rowIndex}>
              {Array.from({ length: wordLength }, (__, index) => {
                const letter = revealed.includes(index) && !guess && rowIndex === guesses.length
                  ? answer[index]
                  : letters[index] || ''
                const revealedSlot = revealed.includes(index) && !guess && rowIndex === guesses.length
                const isEditableLetter = !guess && letter
                return isEditableLetter ? (
                  <button className={`wordle-tile editable ${revealedSlot ? 'correct' : ''}`} key={index} onClick={() => !revealedSlot && removeLetterAt(index)}>{letter}</button>
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
