import { useEffect, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { getWordsByLength, getXPForLevel, isValidWord, shuffle } from '../utils/wordUtils'

function Wordchain({ level, onComplete, showToast }) {
  const maxTime = Math.max(6, 15 - Math.floor(level / 3))
  const targetChain = 5 + level
  const [starter] = useState(() => shuffle(getWordsByLength(3))[0]?.word || 'cat')
  const [requiredLetter, setRequiredLetter] = useState(starter[0])
  const [input, setInput] = useState('')
  const [chain, setChain] = useState([])
  const [score, setScore] = useState(0)
  const [hearts, setHearts] = useState(3)
  const [timeLeft, setTimeLeft] = useState(maxTime)
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
        setHearts((current) => {
          const next = current - 1
          if (next <= 0) {
            showToast('Chain broken — start a new run!', 'error')
            setChain([])
            setScore(0)
            return 3
          }
          showToast('Time ran out. One heart lost.', 'error')
          return next
        })
        return maxTime
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [maxTime, paused, showToast])

  function submit(event) {
    event.preventDefault()
    const word = input.trim().toLowerCase()
    if (word.length < 3) return showToast('Too short!', 'error')
    if (!word.startsWith(requiredLetter)) return showToast(`Must start with '${requiredLetter.toUpperCase()}'`, 'error')
    if (!isValidWord(word)) return showToast(`'${word}' isn't valid`, 'error')
    if (chain.includes(word)) return showToast(`Already used '${word}'`, 'error')
    const nextChain = [word, ...chain]
    const nextScore = score + word.length * 10
    setChain(nextChain)
    setScore(nextScore)
    setRequiredLetter(word.at(-1))
    setInput('')
    setTimeLeft(maxTime)
    showToast('Chain extended!', 'success')
    if (nextChain.length >= targetChain) onComplete(nextScore, getXPForLevel(level), level + 1)
  }

  return (
    <div className="game-panel">
      <ScoreBar score={score} xp={getXPForLevel(level)} />
      <div className="status-row">
        <span aria-label={`${hearts} hearts`}>{'♥ '.repeat(hearts).trim()}</span>
        <span>{chain.length}/{targetChain} words</span>
      </div>
      <div className="timer-track" aria-label={`${timeLeft} seconds remaining`}>
        <span style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
      </div>
      <section className="prompt-card">
        <p>Next word starts with</p>
        <strong className="big-letter">{requiredLetter}</strong>
      </section>
      <form className="game-form" onSubmit={submit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value.replace(/[^a-z]/gi, ''))}
          placeholder="Type a word..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
          aria-label="Next word"
        />
        <button className="btn-primary" type="submit">SUBMIT</button>
      </form>
      <section className="history-panel">
        <div className="panel-title"><span>Chain</span><small>Newest first</small></div>
        <div className="chain-list">
          {chain.length ? chain.map((word, index) => (
            <span className="word-chip" key={word}>{index === 0 ? '↑ ' : ''}{word}</span>
          )) : <p className="empty-state">Your chain will appear here.</p>}
        </div>
      </section>
    </div>
  )
}

export default Wordchain
