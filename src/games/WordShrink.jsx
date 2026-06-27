import { useMemo, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { getShrinkableWords, getXPForLevel, isValidWord, VALID_WORDS } from '../utils/wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from '../utils/uniqueWords'

function WordShrink({
  level,
  onComplete,
  showToast,
  hapticsEnabled = true,
  soundEnabled = true,
  xpMultiplier = 1,
  streakMultiplier = 1,
  player = null,
}) {
  const startLength = level <= 5 ? 6 : level <= 10 ? 7 : 8
  const start = useMemo(() => {
    const pool = getShrinkableWords(startLength)
    return pickUnusedWord(pool, ({ word }) => word)
  }, [startLength])
  const [removedIndex, setRemovedIndex] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [history, setHistory] = useState([start?.word || ''])
  const currentWord = history.at(-1)
  const stepsLeft = currentWord.length - 3
  const remaining = removedIndex === null
    ? ''
    : currentWord.split('').filter((_, index) => index !== removedIndex).join('')

  function applyShrink(answer) {
    rememberWord(answer)
    const nextScore = score + answer.length * 25
    setScore(nextScore)
    setHistory((words) => [...words, answer])
    setRemovedIndex(null)
    setInput('')
    playSound('correct', soundEnabled)
    triggerHaptic(hapticsEnabled, 18)
    showToast('Perfect shrink!', 'success')
    if (answer.length === 3) onComplete(nextScore, getXPForLevel(level), level + 1)
  }

  function getArrangement(letters) {
    const signature = [...letters].sort().join('')
    return VALID_WORDS.find((word) =>
      word.length === letters.length && !hasUsedWord(word) && [...word].sort().join('') === signature)
  }

  function chooseLetter(index) {
    triggerHaptic(hapticsEnabled, 8)
    playSound('key', soundEnabled)
    if (removedIndex === index) {
      setRemovedIndex(null)
      setInput('')
      return
    }
    const nextRemaining = currentWord.split('').filter((_, itemIndex) => itemIndex !== index).join('')
    const arrangement = getArrangement(nextRemaining)
    setRemovedIndex(index)
    setInput(arrangement || nextRemaining)
    if (!arrangement) {
      showToast('No valid word from that removal. Try another letter.', 'error')
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      return
    }
    window.setTimeout(() => applyShrink(arrangement), 0)
  }

  function confirm(event) {
    event.preventDefault()
    const answer = input.trim().toLowerCase()
    const fail = (message) => {
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      showToast(message, 'error')
    }
    if (removedIndex === null) return fail('Tap a letter to remove first.')
    if ([...answer].sort().join('') !== [...remaining].sort().join('')) {
      return fail('Use every remaining letter exactly once.')
    }
    if (!isValidWord(answer)) return fail(`'${answer}' is not a valid word.`)
    if (hasUsedWord(answer)) return fail(`'${answer}' was already used in another puzzle.`)
    applyShrink(answer)
  }

  function hint() {
    const target = getArrangement(remaining)
    if (!target) return showToast('Try removing a different letter.', 'info')
    setInput(target)
    setScore((value) => Math.max(0, value - 10))
  }

  if (!start) {
    return <div className="game-panel"><p className="empty-state">No fresh shrink words available.</p></div>
  }

  return (
    <div className="game-panel">
      <ScoreBar
        score={score}
        xp={Math.round(getXPForLevel(level) * xpMultiplier)}
        xpMultiplier={xpMultiplier}
        streakMultiplier={streakMultiplier}
        streakCount={player?.streak?.count || 0}
      />
      <div className="status-row"><span className="neutral-status">Steps left</span><strong>{stepsLeft}</strong></div>
      <section className="puzzle-card shrink-card">
        <div>
          <p className="puzzle-label">Tap the letter to remove</p>
          <div className="tile-row">
            {currentWord.split('').map((letter, index) => (
              <button className={`tile ${removedIndex === index ? 'incorrect' : ''}`} key={`${letter}-${index}`}
                onClick={() => chooseLetter(index)}>{letter}</button>
            ))}
          </div>
        </div>
        {removedIndex !== null && (
          <div className="remaining-preview">
            <p className="puzzle-label">Remaining letters</p>
            <strong className="mono">{remaining.toUpperCase().split('').join(' ')}</strong>
          </div>
        )}
      </section>
      <form className="game-form" onSubmit={confirm}>
        <label htmlFor="shrink-answer">New arrangement</label>
        <input id="shrink-answer" type="text" value={input}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^a-z]/gi, '')
            if (nextValue.length > input.length) {
              triggerHaptic(hapticsEnabled, 8)
              playSound('key', soundEnabled)
            }
            setInput(nextValue)
          }}
          inputMode="text" autoCapitalize="none" autoCorrect="off" spellCheck="false" autoComplete="off"
          disabled={removedIndex === null} placeholder="Arrange remaining letters..." />
        <div className="button-grid">
          <button className="btn-secondary" type="button" onClick={hint} disabled={removedIndex === null}>HINT −10</button>
          <button className="btn-primary" type="submit">CONFIRM</button>
        </div>
      </form>
      <section className="history-panel">
        <div className="panel-title"><span>Shrink history</span><small>{start.word.length} → 3 letters</small></div>
        <div className="shrink-history">
          {history.map((word, index) => (
            <div key={`${word}-${index}`}><strong>{word}</strong>{index < history.length - 1 && <span>↓</span>}</div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default WordShrink
