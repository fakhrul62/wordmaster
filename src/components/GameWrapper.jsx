import LevelBadge from './LevelBadge'
import { useState } from 'react'
import Wordchain from '../games/Wordchain'
import AnagramVault from '../games/AnagramVault'
import CrossClue from '../games/CrossClue'
import WordShrink from '../games/WordShrink'

const GAME_NAMES = {
  wordchain: 'WordChain',
  anagramvault: 'Anagram Vault',
  crossclue: 'CrossClue',
  wordshrink: 'WordShrink',
  letterlock: 'LetterLock',
}

const GAME_COMPONENTS = {
  wordchain: Wordchain,
  anagramvault: AnagramVault,
  crossclue: CrossClue,
  wordshrink: WordShrink,
}

function spawnConfetti() {
  const colors = ['#8268ff', '#ff5f8f', '#5cf8d0', '#ffd45c', '#5cf8a0']
  for (let index = 0; index < 10; index += 1) {
    const piece = document.createElement('i')
    piece.className = 'confetti-piece'
    piece.style.left = `${Math.random() * 100}%`
    piece.style.background = colors[index % colors.length]
    piece.style.animationDelay = `${Math.random() * 0.4}s`
    document.body.appendChild(piece)
    window.setTimeout(() => piece.remove(), 2400)
  }
}

function GameWrapper({ gameKey, level, onBack, onComplete, showToast }) {
  const [result, setResult] = useState(null)
  const Game = GAME_COMPONENTS[gameKey]
  function leaveGame() {
    if (window.confirm('Leave this game? Current level progress will be lost.')) onBack()
  }

  function finish(score, xp, nextLevel) {
    onComplete(score, xp, nextLevel)
    setResult({ score, xp, nextLevel })
    spawnConfetti()
  }

  return (
    <main className="screen game-wrapper">
      <header className="game-topbar">
        <button className="back-button" onClick={leaveGame}>← Back</button>
        <strong>{GAME_NAMES[gameKey]}</strong>
        <LevelBadge level={level} />
      </header>
      <section className="game-content">
        {Game ? (
          <Game key={`${gameKey}-${level}`} level={level} onComplete={finish} showToast={showToast} />
        ) : (
          <div className="game-placeholder"><h1>{GAME_NAMES[gameKey]}</h1><p>Coming in the next build step.</p></div>
        )}
      </section>
      {result && (
        <div className="level-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="level-complete-title">
          <p className="eyebrow">Level cleared</p>
          <h1 id="level-complete-title">Excellent work.</h1>
          <div className="result-score"><span>{result.score} points</span><span>+{result.xp} XP</span></div>
          <div className="btn-row">
            <button className="btn-primary" onClick={() => setResult(null)}>NEXT LEVEL</button>
            <button className="btn-secondary" onClick={onBack}>HOME</button>
          </div>
        </div>
      )}
    </main>
  )
}

export default GameWrapper
