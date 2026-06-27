import { useEffect, useState } from 'react'
import ScoreBar from '../components/ScoreBar'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { VALID_WORDS, getWordsByLength, getXPForLevel, isValidWord, shuffle } from '../utils/wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from '../utils/uniqueWords'

function Wordchain({
  level,
  onComplete,
  showToast,
  hapticsEnabled = true,
  soundEnabled = true,
  difficulty = 'normal',
  timerMode = true,
  xpMultiplier = 1,
  streakMultiplier = 1,
  player = null,
}) {
  const difficultyTime = difficulty === 'easy' ? 25 : difficulty === 'hard' ? 10 : 18
  const maxTime = timerMode ? difficultyTime : 999
  const targetChain = 5 + level
  const [starter] = useState(() => {
    const pool = getWordsByLength(3)
    return pickUnusedWord(pool, ({ word }) => word)?.word || ''
  })
  const [requiredLetter, setRequiredLetter] = useState(starter[0] || 'a')
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
    if (paused || !timerMode) return undefined
    const timer = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time > 1) return time - 1
        setHearts((current) => {
          const next = current - 1
          if (next <= 0) {
            showToast('Chain broken — start a new run!', 'error')
            playSound('wrong', soundEnabled)
            triggerHaptic(hapticsEnabled, 40)
            setChain([])
            setScore(0)
            return 3
          }
          showToast('Time ran out. One heart lost.', 'error')
          playSound('wrong', soundEnabled)
          triggerHaptic(hapticsEnabled, 40)
          return next
        })
        return maxTime
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hapticsEnabled, maxTime, paused, showToast, soundEnabled, timerMode])

  function submit(event) {
    event.preventDefault()
    const word = input.trim().toLowerCase()
    const fail = (message) => {
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      showToast(message, 'error')
    }
    if (word.length < 3) return fail('Too short!')
    if (!word.startsWith(requiredLetter)) return fail(`Must start with '${requiredLetter.toUpperCase()}'`)
    if (!isValidWord(word)) return fail(`'${word}' isn't valid`)
    if (chain.includes(word)) return fail(`Already used '${word}'`)
    if (hasUsedWord(word)) return fail(`'${word}' was already used in another puzzle.`)
    rememberWord(word)
    const nextChain = [word, ...chain]
    const nextScore = score + word.length * 10
    setChain(nextChain)
    setScore(nextScore)
    const naturalNext = word.at(-1)
    const hasContinuation = VALID_WORDS.some((entry) =>
      entry.startsWith(naturalNext) && !nextChain.includes(entry) && !hasUsedWord(entry))
    if (hasContinuation) {
      setRequiredLetter(naturalNext)
    } else {
      const wildcard = shuffle(VALID_WORDS.filter((entry) => !nextChain.includes(entry) && !hasUsedWord(entry)))[0]?.[0] || 'a'
      setRequiredLetter(wildcard)
      showToast(`Dead end — wildcard letter ${wildcard.toUpperCase()}!`, 'info')
    }
    setInput('')
    setTimeLeft(maxTime)
    playSound('correct', soundEnabled)
    triggerHaptic(hapticsEnabled, 18)
    if (hasContinuation) showToast('Chain extended!', 'success')
    if (nextChain.length >= targetChain) onComplete(nextScore, getXPForLevel(level), level + 1)
  }

  if (!starter) {
    return <div className="game-panel"><p className="empty-state">No fresh chain words available.</p></div>
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
      <div className="status-row">
        <span aria-label={`${hearts} hearts`}>{'♥ '.repeat(hearts).trim()}</span>
        <span>{chain.length}/{targetChain} words</span>
      </div>
      {timerMode ? (
        <div className="timer-track" aria-label={`${timeLeft} seconds remaining`}>
          <span style={{ width: `${(timeLeft / maxTime) * 100}%` }} />
        </div>
      ) : <span className="hud-badge">No time limit</span>}
      <section className="prompt-card">
        <p>Next word starts with</p>
        <strong className="big-letter">{requiredLetter}</strong>
      </section>
      <form className="game-form" onSubmit={submit}>
        <input
          type="text"
          value={input}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^a-z]/gi, '')
            if (nextValue.length > input.length) {
              triggerHaptic(hapticsEnabled, 8)
              playSound('key', soundEnabled)
            }
            setInput(nextValue)
          }}
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
