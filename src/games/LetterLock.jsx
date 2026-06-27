import { useEffect, useMemo, useState } from 'react'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { getLetterLockSets, getSubWords, getXPForLevel, isValidWord } from '../utils/wordUtils'
import { hasUsedWord, pickUnusedWord, rememberWord } from '../utils/uniqueWords'

function bestCenterLetter(source, candidates) {
  const unique = [...new Set(source)]
  return unique.sort((a, b) =>
    candidates.filter((word) => word.includes(b)).length -
    candidates.filter((word) => word.includes(a)).length)[0]
}

function LetterLock({
  level,
  onComplete,
  showToast,
  hapticsEnabled = true,
  soundEnabled = true,
  difficulty = 'normal',
  timerMode = true,
}) {
  const [set] = useState(() => {
    const pool = getLetterLockSets()
    return pickUnusedWord(pool, ({ word }) => word)
  })
  const source = set?.word || ''
  const allValidWords = useMemo(() => getSubWords(source), [source])
  const centerLetter = useMemo(() => bestCenterLetter(source, allValidWords), [allValidWords, source])
  const centerIndex = source.indexOf(centerLetter)
  const ringLetters = [...source.slice(0, centerIndex), ...source.slice(centerIndex + 1)]
  const validWords = useMemo(
    () => allValidWords.filter((word) => word.includes(centerLetter)),
    [allValidWords, centerLetter],
  )
  const target = Math.min(8, Math.max(4, Math.floor(validWords.length * 0.45)))
  const baseTime = Math.max(60, 120 - level * 2)
  const timeLimit = Math.max(30, Math.round(baseTime * (difficulty === 'easy' ? 1.2 : difficulty === 'hard' ? 0.8 : 1)))
  const [answer, setAnswer] = useState('')
  const [found, setFound] = useState([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [paused, setPaused] = useState(false)
  const containerSize = window.innerWidth >= 1180
    ? Math.min(window.innerWidth * 0.32, 430)
    : Math.min(window.innerWidth - 32, 280)
  const radius = containerSize * 0.33
  const tileSize = Math.max(44, Math.min(window.innerWidth >= 1180 ? 76 : 52, containerSize * 0.18))
  const positions = [0, 60, 120, 180, 240, 300].map((degrees) => ({
    x: Math.round(Math.cos((degrees - 90) * Math.PI / 180) * radius),
    y: Math.round(Math.sin((degrees - 90) * Math.PI / 180) * radius),
  }))

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
        showToast('Time is up. The lock has reset.', 'error')
        playSound('wrong', soundEnabled)
        triggerHaptic(hapticsEnabled, 40)
        setFound([])
        setScore(0)
        setAnswer('')
        return timeLimit
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hapticsEnabled, paused, showToast, soundEnabled, timeLimit, timerMode])

  useEffect(() => {
    function keyboard(event) {
      if (event.key === 'Backspace') return setAnswer((value) => value.slice(0, -1))
      if (event.key === 'Enter') return document.querySelector('[data-letterlock-submit]')?.click()
      if (/^[a-z]$/i.test(event.key)) addLetter(event.key.toLowerCase())
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  })

  function addLetter(letter) {
    setAnswer((value) => {
      const available = source.split('').filter((item) => item === letter).length
      const used = value.split('').filter((item) => item === letter).length
      if (used < available) {
        triggerHaptic(hapticsEnabled, 8)
        playSound('key', soundEnabled)
      }
      return used < available ? value + letter : value
    })
  }

  function submit() {
    const fail = (message) => {
      playSound('wrong', soundEnabled)
      triggerHaptic(hapticsEnabled, 40)
      showToast(message, 'error')
    }
    if (answer.length < 3) return fail('Words need at least three letters.')
    if (!answer.includes(centerLetter)) return fail(`Every word must include ${centerLetter.toUpperCase()}.`)
    if (!isValidWord(answer) || !validWords.includes(answer)) return fail(`'${answer}' is not in this lock.`)
    if (found.includes(answer)) return fail(`Already found '${answer}'.`)
    if (answer !== source && hasUsedWord(answer)) return fail(`'${answer}' was already used in another puzzle.`)
    rememberWord(answer)
    const pangram = answer.length === source.length && [...answer].sort().join('') === [...source].sort().join('')
    const nextScore = score + answer.length * 10 + (pangram ? 50 : 0)
    const nextFound = [...found, answer]
    setScore(nextScore)
    setFound(nextFound)
    setAnswer('')
    playSound('correct', soundEnabled)
    triggerHaptic(hapticsEnabled, 18)
    showToast(pangram ? 'Pangram! Bonus unlocked.' : 'Word found!', 'success')
    if (nextFound.length >= target) onComplete(nextScore, getXPForLevel(level), level + 1)
  }

  if (!source || !centerLetter) {
    return <div className="game-panel"><p className="empty-state">No fresh lock words available.</p></div>
  }

  return (
    <div className="game-panel">
      <div className="lock-status">
        <div><small>Found</small><strong>{found.length}/{target}</strong></div>
        {timerMode
          ? <div className="timer-track"><span style={{ width: `${(timeLeft / timeLimit) * 100}%` }} /></div>
          : <span className="hud-badge">No time limit</span>}
        <div><small>Score</small><strong>{score}</strong></div>
      </div>
      <div className="letterlock-answer" aria-label={`Current answer: ${answer || 'empty'}`}>
        {answer ? answer.split('').map((letter, index) => (
          <button
            className="letterlock-answer-letter"
            key={`${letter}-${index}`}
            onClick={() => {
              triggerHaptic(hapticsEnabled, 8)
              playSound('key', soundEnabled)
              setAnswer((value) => `${value.slice(0, index)}${value.slice(index + 1)}`)
            }}
          >
            {letter}
          </button>
        )) : <em>Tap letters to spell</em>}
      </div>
      <div className="button-grid">
        <button className="btn-secondary" onClick={() => setAnswer('')}>CLEAR</button>
        <button className="btn-primary" data-letterlock-submit onClick={submit}>SUBMIT</button>
      </div>
      <div className="hex-ring" style={{ width: containerSize, height: containerSize }}>
        <button className="tile tile-center" style={{ width: tileSize, height: tileSize }} onClick={() => addLetter(centerLetter)}>
          {centerLetter}
        </button>
        {positions.map((position, index) => (
          <button className="tile ring-tile" key={`${ringLetters[index]}-${index}`} style={{
            width: tileSize, height: tileSize,
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          }} onClick={() => addLetter(ringLetters[index])}>{ringLetters[index]}</button>
        ))}
      </div>
      <section className="history-panel">
        <div className="panel-title"><span>Found words</span><small>{validWords.length} possible</small></div>
        <div className="found-words">
          {found.length ? found.map((word) => {
            const pangram = word.length === source.length
            return <span className={`found-word-chip ${pangram ? 'pangram' : ''}`} key={word}>{word}{pangram ? ' ★' : ''}</span>
          }) : <p className="empty-state">Your discoveries will appear here.</p>}
        </div>
      </section>
    </div>
  )
}

export default LetterLock
