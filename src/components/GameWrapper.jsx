import LevelBadge from './LevelBadge'
import { useEffect, useRef, useState } from 'react'
import { readHapticsPreference, triggerHaptic, writeHapticsPreference } from '../utils/haptics'
import { GAME_NAMES } from '../data/gameCatalog'
import { BOGGLE_MODES, getGameTrack, getLevelMap } from '../utils/progression'
import Wordchain from '../games/Wordchain'
import AnagramVault from '../games/AnagramVault'
import CrossClue from '../games/CrossClue'
import WordShrink from '../games/WordShrink'
import LetterLock from '../games/LetterLock'
import Wordle from '../games/Wordle'
import Boggle from '../games/Boggle'

const GAME_COMPONENTS = {
  wordchain: Wordchain,
  anagramvault: AnagramVault,
  crossclue: CrossClue,
  wordshrink: WordShrink,
  letterlock: LetterLock,
  wordle: Wordle,
  boggle: Boggle,
}

const GAME_RULES = {
  wordchain: [
    'Enter a valid word that starts with the required letter.',
    'Each accepted word sets the next required letter from its last letter.',
    'Reused or invalid words do not count. Build the target chain before hearts run out.',
  ],
  anagramvault: [
    'Tap scrambled tiles to build the answer.',
    'Tap a selected tile again, or tap a filled answer slot, to remove that letter.',
    'Solve the sequence before the timer resets.',
  ],
  crossclue: [
    'Tap a clue or cell to choose where to type.',
    'Fill every crossing answer correctly.',
    'Tap the active filled cell again to erase that letter and replace it.',
  ],
  wordshrink: [
    'Tap one letter to remove it, then make a valid word from all remaining letters.',
    'Tap the selected removed letter again to undo before confirming.',
    'Shrink the word down to 3 letters to finish the level.',
  ],
  letterlock: [
    'Build valid words from the letter ring.',
    'Every word must include the center letter.',
    'Tap an entered answer letter to remove it before submitting.',
  ],
  wordle: [
    'Pick a word length, then guess the hidden word in six tries.',
    'Green means correct spot, yellow means wrong spot, and gray means absent.',
    'Solve fast enough to hit the point target and unlock the next level.',
    'Tap an entered tile in the current row to delete that letter. Use the enter icon to submit.',
  ],
  boggle: [
    'Trace connected tiles to spell words at least the chosen length.',
    'Tap the last selected tile again to remove it before submitting.',
    'Submit valid words to reach the target score before time runs out.',
  ],
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

function GameWrapper({
  gameKey,
  level,
  mode = null,
  gameProgress = null,
  unlockedLevel = level,
  onBack,
  onHome,
  onModeSelect,
  onComplete,
  showToast,
}) {
  const [result, setResult] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(readHapticsPreference)
  const [selectedLevel, setSelectedLevel] = useState(level)
  const [selectedMode, setSelectedMode] = useState(Number(mode || gameProgress?.selectedMode || 3))
  const [levelSelectionOpen, setLevelSelectionOpen] = useState(true)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const previousGameKey = useRef(gameKey)
  const Game = GAME_COMPONENTS[gameKey]
  const rules = GAME_RULES[gameKey]
  const activeTrack = getGameTrack(gameProgress, gameKey, gameKey === 'boggle' ? selectedMode : null)
  const activeUnlockedLevel = gameKey === 'boggle' ? Math.max(activeTrack.level, selectedLevel) : unlockedLevel
  const visibleLevels = getLevelMap(activeUnlockedLevel)

  useEffect(() => {
    if (previousGameKey.current === gameKey) return
    previousGameKey.current = gameKey
    const nextMode = Number(mode || gameProgress?.selectedMode || 3)
    setSelectedMode(nextMode)
    setSelectedLevel(level)
    setLevelSelectionOpen(true)
    setRulesAccepted(false)
  }, [gameKey, gameProgress, level, mode])

  useEffect(() => {
    if (gameKey !== 'boggle' || !mode) return
    setSelectedMode(Number(mode))
  }, [gameKey, mode])

  useEffect(() => {
    setSelectedLevel(level)
  }, [level])

  function toggleHaptics() {
    setHapticsEnabled((enabled) => {
      const next = !enabled
      writeHapticsPreference(next)
      triggerHaptic(next, 20)
      return next
    })
  }

  function leaveGame() {
    setConfirmLeave(true)
  }

  function finish(score, xp, nextLevel) {
    onComplete(score, xp, nextLevel, { mode: gameKey === 'boggle' ? selectedMode : null })
    setSelectedLevel(nextLevel)
    setLevelSelectionOpen(false)
    setRulesAccepted(true)
    setResult({ score, xp, nextLevel })
    spawnConfetti()
  }

  function chooseLevel(nextLevel) {
    if (nextLevel > activeUnlockedLevel) return
    setSelectedLevel(nextLevel)
  }

  function chooseMode(nextMode) {
    const normalizedMode = Number(nextMode)
    const track = getGameTrack(gameProgress, gameKey, normalizedMode)
    setSelectedMode(normalizedMode)
    setSelectedLevel(track.level)
    onModeSelect?.(normalizedMode, track.level)
  }

  function startSelectedLevel() {
    if (gameKey === 'boggle') onModeSelect?.(selectedMode, selectedLevel)
    setLevelSelectionOpen(false)
  }

  return (
    <main className="screen game-wrapper">
      <header className="game-topbar">
        <button className="back-button" onClick={leaveGame}>← Back</button>
        <h1 className="game-topbar-title">{GAME_NAMES[gameKey]}</h1>
        <div className="game-topbar-actions">
          <button className="home-icon-button" onClick={onHome} aria-label="Go home">⌂</button>
          <button
            className={`haptic-toggle ${hapticsEnabled ? 'enabled' : ''}`}
            onClick={toggleHaptics}
            aria-pressed={hapticsEnabled}
            aria-label={`Haptic feedback ${hapticsEnabled ? 'on' : 'off'}`}
          >
            {hapticsEnabled ? 'VIB ON' : 'VIB OFF'}
          </button>
          <LevelBadge level={selectedLevel} />
        </div>
      </header>
      <section className="game-content">
        {Game && levelSelectionOpen ? (
          <section className="level-select-panel" aria-labelledby="level-select-title">
            <p className="eyebrow">Level progression</p>
            <h1 id="level-select-title">{GAME_NAMES[gameKey]}</h1>
            {gameKey === 'boggle' && (
              <div className="boggle-mode-selector" aria-label="Boggle minimum word length">
                {BOGGLE_MODES.map((item) => {
                  const track = getGameTrack(gameProgress, gameKey, item)
                  return (
                    <button
                      className={selectedMode === item ? 'selected' : ''}
                      key={item}
                      onClick={() => chooseMode(item)}
                    >
                      <strong>{item}</strong>
                      <small>LV {track.level}</small>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="level-select-summary">
              <span><small>{gameKey === 'boggle' ? `${selectedMode}+ track` : 'Current'}</small><strong>LV {activeUnlockedLevel}</strong></span>
              <span><small>Next unlock</small><strong>LV {activeUnlockedLevel + 1}</strong></span>
            </div>
            <div className="level-map" aria-label="Level selection">
              {visibleLevels.map((entry) => (
                <button
                  className={`level-node ${entry.current ? 'current' : ''} ${entry.next ? 'next' : ''} ${selectedLevel === entry.level ? 'selected' : ''}`}
                  disabled={!entry.unlocked}
                  key={entry.level}
                  onClick={() => chooseLevel(entry.level)}
                >
                  <span>{entry.unlocked ? entry.level : '🔒'}</span>
                  <small>{entry.current ? 'Current' : entry.next ? 'Locked' : entry.unlocked ? 'Open' : 'Soon'}</small>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={startSelectedLevel}>START LEVEL {selectedLevel}</button>
          </section>
        ) : Game && rules && !rulesAccepted ? (
          <section className="rules-panel" aria-labelledby="rules-title">
            <p className="eyebrow">How to play</p>
            <h1 id="rules-title">{GAME_NAMES[gameKey]}</h1>
            <div className="rules-level-row">
              <LevelBadge level={selectedLevel} />
              <button className="btn-secondary" onClick={() => setLevelSelectionOpen(true)}>CHANGE</button>
            </div>
            <ul className="rules-list">
              {rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <button className="btn-primary" onClick={() => setRulesAccepted(true)}>START</button>
          </section>
        ) : Game ? (
          <Game
            key={`${gameKey}-${selectedLevel}`}
            level={selectedLevel}
            minimumLength={gameKey === 'boggle' ? selectedMode : undefined}
            onComplete={finish}
            showToast={showToast}
            hapticsEnabled={hapticsEnabled}
          />
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
      {confirmLeave && (
        <div className="leave-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="leave-confirm-title">
          <section className="leave-confirm-card">
            <p className="eyebrow">Pause run</p>
            <h2 id="leave-confirm-title">Leave this level?</h2>
            <p>Your current level progress will be lost.</p>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setConfirmLeave(false)}>STAY</button>
              <button className="btn-primary" onClick={onBack}>LEAVE</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default GameWrapper
