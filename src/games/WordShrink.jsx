import { useMemo, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { getShrinkableWords, getXPForLevel, isValidWord, shuffle } from '../utils/wordUtils'

function WordShrink({ level, onComplete, showToast }) {
  const startLength = level <= 5 ? 6 : level <= 10 ? 7 : 8
  const start = useMemo(() => shuffle(getShrinkableWords(startLength))[0], [startLength])
  const chain = start?.shrinkChain || []
  const [step, setStep] = useState(0)
  const [removedIndex, setRemovedIndex] = useState(null)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const history = [start.word, ...chain.slice(0, step)]
  const currentWord = history.at(-1)
  const target = chain[step]
  const remaining = removedIndex === null
    ? ''
    : currentWord.split('').filter((_, index) => index !== removedIndex).join('')

  function chooseLetter(index) {
    setRemovedIndex(index)
    setInput('')
  }

  function confirm(event) {
    event.preventDefault()
    const answer = input.trim().toLowerCase()
    if (removedIndex === null) return showToast('Tap a letter to remove first.', 'error')
    if ([...answer].sort().join('') !== [...remaining].sort().join('')) {
      return showToast('Use every remaining letter exactly once.', 'error')
    }
    if (!isValidWord(answer) || answer !== target) return showToast(`'${answer}' does not continue this shrink.`, 'error')
    const nextScore = score + answer.length * 25
    const nextStep = step + 1
    setScore(nextScore)
    setStep(nextStep)
    setRemovedIndex(null)
    setInput('')
    showToast('Perfect shrink!', 'success')
    if (nextStep >= chain.length) onComplete(nextScore, getXPForLevel(level), level + 1)
  }

  function hint() {
    setInput(target)
    setScore((value) => Math.max(0, value - 10))
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <div className="status-row"><span className="neutral-status">Steps left</span><strong>{chain.length - step}</strong></div>
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
        <label htmlFor="shrink-answer">Type the new arrangement</label>
        <input id="shrink-answer" type="text" value={input}
          onChange={(event) => setInput(event.target.value.replace(/[^a-z]/gi, ''))}
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
