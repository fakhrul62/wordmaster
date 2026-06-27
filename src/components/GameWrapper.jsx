import LevelBadge from './LevelBadge'
import DifficultyPicker from './DifficultyPicker'
import { useEffect, useRef, useState } from 'react'
import { playSound } from '../utils/audio'
import { triggerHaptic } from '../utils/haptics'
import { GAME_NAMES } from '../data/gameCatalog'
import { WORD_PACKS } from '../data/wordPacks'
import {
  BOGGLE_MODES,
  getGameTrack,
  getLevelMap,
  getRunXPMultiplier,
  getStreakMultiplier,
} from '../utils/progression'
import Wordchain from '../games/Wordchain'
import AnagramVault from '../games/AnagramVault'
import CrossClue from '../games/CrossClue'
import WordShrink from '../games/WordShrink'
import LetterLock from '../games/LetterLock'
import Wordle from '../games/Wordle'
import Boggle from '../games/Boggle'
import WordSearchPuzzle from '../games/WordSearchPuzzle'
import {
  AnagramBattle,
  CategoryRush,
  CipherWords,
  CrosswordDaily,
  DefinitionDuel,
  MissingLetter,
  QuoteFill,
  RhymeTime,
  SpellingBee,
  SynonymMatch,
  TypingSprint,
  WordLadder,
  WordMaze,
  WordSearch,
  WordSort,
} from '../games/ExtraGames'

const GAME_COMPONENTS = {
  wordchain: Wordchain,
  anagramvault: AnagramVault,
  crossclue: CrossClue,
  wordshrink: WordShrink,
  letterlock: LetterLock,
  wordle: Wordle,
  boggle: Boggle,
  wordsearch: WordSearch,
  wordsearchpuzzle: WordSearchPuzzle,
  typingsprint: TypingSprint,
  spellingbee: SpellingBee,
  wordladder: WordLadder,
  definitionduel: DefinitionDuel,
  missingletter: MissingLetter,
  synonymmatch: SynonymMatch,
  categoryrush: CategoryRush,
  wordsort: WordSort,
  cipherwords: CipherWords,
  crossworddaily: CrosswordDaily,
  quotefill: QuoteFill,
  anagrambattle: AnagramBattle,
  wordmaze: WordMaze,
  rhymetime: RhymeTime,
}

const HINTS = {
  wordle: { label: 'Reveal one correct letter in its slot', effect: 'One correct slot is safe to inspect.', cost: 15 },
  boggle: { label: 'Flash a valid word path', effect: 'Look for a short valid path on the board.', cost: 20 },
  anagramvault: { label: 'Reveal one letter in position', effect: 'One answer position is revealed.', cost: 12 },
  crossclue: { label: 'Fill one crossword cell', effect: 'A crossing cell hint is available.', cost: 18 },
  letterlock: { label: 'Highlight one valid word', effect: 'A valid word is highlighted.', cost: 15 },
  wordshrink: { label: 'Show next valid word', effect: 'The next shrink target is hinted.', cost: 15 },
  typingsprint: { label: 'Skip current word', effect: 'Skip is available with no penalty.', cost: 10 },
  wordsearch: { label: 'Circle one hidden word start cell', effect: 'A starting cell is highlighted.', cost: 12 },
  wordsearchpuzzle: { label: 'Circle one hidden word start cell', effect: 'A starting cell is highlighted.', cost: 12 },
  wordchain: { label: 'Show a valid next word', effect: 'A valid next word is hinted.', cost: 15 },
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
    'Submit valid words to reach the target score. Fast clears are tracked silently.',
  ],
  wordsearch: [
    'Tap letters in one row, column, or diagonal line.',
    'Find valid 3, 4, 5, and 6-letter words.',
    'Submit enough fresh words to reach the target count.',
  ],
  wordsearchpuzzle: [
    'Pick a difficulty and theme.',
    'Drag in one straight line to select words forward or reversed.',
    'Find every themed word before stopping the timer.',
  ],
  typingsprint: [
    'Type the displayed word exactly.',
    'Each correct entry advances to the next word.',
    'Clear the whole sprint to finish the level.',
  ],
  spellingbee: [
    'Make words using the displayed letters.',
    'Every answer must include the required center letter.',
    'Find the target list to clear the level.',
  ],
  wordladder: [
    'Change exactly one letter from the current word.',
    'Every step must be a valid word.',
    'Reach the target word to complete the ladder.',
  ],
  definitionduel: [
    'Read the definition and type the matching word.',
    'The letter count is shown for each clue.',
    'Solve every clue to win the duel.',
  ],
  missingletter: [
    'Use the visible letters as a pattern.',
    'Type the complete word, not only the missing letters.',
    'Complete all prompts to clear the level.',
  ],
  synonymmatch: [
    'Pick a word from the left column.',
    'Then choose the matching definition on the right.',
    'Match every pair to finish.',
  ],
  categoryrush: [
    'Read the word-length prompt.',
    'Submit valid words that match the length.',
    'Collect the target number of words.',
  ],
  wordsort: [
    'Read the word in the center.',
    'Sort it into the correct difficulty shelf.',
    'Sort every word without changing modes.',
  ],
  cipherwords: [
    'Each word has been shifted through the alphabet.',
    'Use the shift hint to decode it.',
    'Decode the full sequence to win.',
  ],
  crossworddaily: [
    'Tap a cell or clue to choose where to type.',
    'Fill the crossing answers directly on the crossword grid.',
    'Check the grid when every clue has been answered.',
  ],
  quotefill: [
    'Read the fresh clue.',
    'Type the matching word exactly.',
    'Solve the clue to clear the level.',
  ],
  anagrambattle: [
    'Make smaller words from the long source word.',
    'Use only letters from the source.',
    'Find enough accepted words to win.',
  ],
  wordmaze: [
    'Tap grid letters to spell the target word.',
    'Wrong turns reset the current path.',
    'Clear all target words to finish.',
  ],
  rhymetime: [
    'Use the clue word and ending as your guide.',
    'Submit valid words with the same ending.',
    'Find enough rhymes to clear the level.',
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

function formatResultTime(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function GameWrapper({
  gameKey,
  level,
  mode = null,
  player = null,
  settings = {},
  gameProgress = null,
  unlockedLevel = level,
  onBack,
  onHome,
  onModeSelect,
  onDifficultySelect,
  onTimerModeSelect,
  onPackSelect,
  spendCoins,
  onComplete,
  showToast,
}) {
  const [result, setResult] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const hapticsEnabled = settings.hapticsEnabled !== false
  const soundEnabled = settings.soundEnabled !== false
  const [selectedLevel, setSelectedLevel] = useState(level)
  const [selectedMode, setSelectedMode] = useState(Number(mode || gameProgress?.selectedMode || 3))
  const [levelSelectionOpen, setLevelSelectionOpen] = useState(true)
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [hintOpen, setHintOpen] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const previousGameKey = useRef(gameKey)
  const Game = GAME_COMPONENTS[gameKey]
  const rules = GAME_RULES[gameKey]
  const activeTrack = getGameTrack(gameProgress, gameKey, gameKey === 'boggle' ? selectedMode : null)
  const difficulty = activeTrack.difficulty || 'normal'
  const timerMode = activeTrack.timerMode !== false
  const activePack = activeTrack.activePack || 'default'
  const streakMultiplier = getStreakMultiplier(player?.streak?.count || 0)
  const xpMultiplier = getRunXPMultiplier({ difficulty, timerMode, streakCount: player?.streak?.count || 0 })
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
    setHintsUsed(0)
    setHintOpen(false)
  }, [gameKey, gameProgress, level, mode])

  useEffect(() => {
    if (gameKey !== 'boggle' || !mode) return
    setSelectedMode(Number(mode))
  }, [gameKey, mode])

  useEffect(() => {
    setSelectedLevel(level)
  }, [level])

  function leaveGame() {
    if (result) {
      setResult(null)
      return
    }
    if (!levelSelectionOpen && rulesAccepted) {
      setRulesAccepted(false)
      return
    }
    if (!levelSelectionOpen && !rulesAccepted) {
      setLevelSelectionOpen(true)
      return
    }
    setConfirmLeave(true)
  }

  function finish(score, xp, nextLevel, details = {}) {
    const currentTrack = getGameTrack(gameProgress, gameKey, gameKey === 'boggle' ? selectedMode : null)
    if (nextLevel > currentTrack.level) {
      playSound('level_up', soundEnabled)
      triggerHaptic(hapticsEnabled, [30, 20, 30])
    } else if (score > 0) {
      playSound('correct', soundEnabled)
      triggerHaptic(hapticsEnabled, 18)
    }
    onComplete(score, xp, nextLevel, {
      ...details,
      mode: gameKey === 'boggle' ? selectedMode : null,
      difficulty,
      timerMode,
      activePack,
    })
    setSelectedLevel(nextLevel)
    setLevelSelectionOpen(false)
    setRulesAccepted(true)
    setResult({ score, xp, nextLevel, completionTime: details.completionTime })
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
    setHintsUsed(0)
    setHintOpen(false)
  }

  function useHint() {
    const cost = HINTS[gameKey]?.cost || 15
    if (hintsUsed >= 3) {
      showToast?.('Maximum 3 hints per run.', 'info')
      return
    }
    if (!spendCoins?.(cost)) {
      showToast?.('Not enough coins.', 'error')
      playSound('wrong', soundEnabled)
      return
    }
    setHintsUsed((value) => value + 1)
    setHintOpen(false)
    playSound('coin', soundEnabled)
    triggerHaptic(hapticsEnabled, 18)
    showToast?.(HINTS[gameKey]?.effect || 'Hint unlocked for this run.', 'success')
  }

  return (
    <main className={`screen game-wrapper game-${gameKey}`}>
      <header className="game-topbar">
        <button className="back-button" onClick={leaveGame}>← Back</button>
        <h1 className="game-topbar-title">{GAME_NAMES[gameKey]}</h1>
        <div className="game-topbar-actions">
          <button className="home-icon-button" onClick={onHome} aria-label="Go home">⌂</button>
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
            <DifficultyPicker
              difficulty={difficulty}
              timerMode={timerMode}
              activePack={activePack}
              unlockedPacks={player?.unlockedPacks || []}
              packs={WORD_PACKS}
              onDifficultyChange={(value) => onDifficultySelect?.(gameKey, value, gameKey === 'boggle' ? selectedMode : null)}
              onTimerModeChange={(value) => onTimerModeSelect?.(gameKey, value, gameKey === 'boggle' ? selectedMode : null)}
              onPackChange={(value) => onPackSelect?.(gameKey, value, gameKey === 'boggle' ? selectedMode : null)}
            />
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
          <>
            <div className="game-hud-row">
              <span className="hud-badge">{timerMode ? 'Timed' : 'No time limit'}</span>
              <span className="hud-badge">x{xpMultiplier.toFixed(2).replace(/\.00$/, '')} XP</span>
              {streakMultiplier > 1 && <span className="hud-badge streak">🔥 x{streakMultiplier.toFixed(2).replace(/\.00$/, '')}</span>}
              <div className="hint-menu">
                <button
                  className="hint-button"
                  onClick={() => setHintOpen((open) => !open)}
                  disabled={!player?.coins}
                  title={player?.coins ? 'Use a hint' : 'Earn coins by completing daily challenges'}
                  aria-label="Use a hint"
                >
                  💡
                </button>
                {hintOpen && (
                  <div className="hint-popover">
                    <strong>{HINTS[gameKey]?.label || 'Reveal one answer element'}</strong>
                    <small>{HINTS[gameKey]?.cost || 15} coins · {3 - hintsUsed} left</small>
                    <button className="btn-primary" onClick={useHint}>USE HINT</button>
                  </div>
                )}
              </div>
            </div>
            <Game
              key={`${gameKey}-${selectedLevel}-${difficulty}-${timerMode}-${activePack}`}
              level={selectedLevel}
              gameKey={gameKey}
              player={player}
              minimumLength={gameKey === 'boggle' ? selectedMode : undefined}
              difficulty={difficulty}
              timerMode={timerMode}
              activePack={activePack}
              xpMultiplier={xpMultiplier}
              streakMultiplier={streakMultiplier}
              onComplete={finish}
              showToast={showToast}
              hapticsEnabled={hapticsEnabled}
              soundEnabled={soundEnabled}
            />
          </>
        ) : (
          <div className="game-placeholder"><h1>{GAME_NAMES[gameKey]}</h1><p>Coming in the next build step.</p></div>
        )}
      </section>
      {result && (
        <div className="level-complete-overlay" role="dialog" aria-modal="true" aria-labelledby="level-complete-title">
          <p className="eyebrow">Level cleared</p>
          <h1 id="level-complete-title">Excellent work.</h1>
          <div className="result-score">
            <span>{result.score} points</span>
            <span>+{result.xp} XP</span>
            {result.completionTime && <span>{formatResultTime(result.completionTime)}</span>}
          </div>
          {player?.lastRun?.gameKey === gameKey && (
            <p className="xp-breakdown">
              Base XP: {player.lastRun.baseXP} · x{player.lastRun.streakMultiplier.toFixed(2).replace(/\.00$/, '')} streak · x{player.lastRun.difficultyMultiplier.toFixed(2).replace(/\.00$/, '')} {player.lastRun.difficulty} · x{player.lastRun.timerMultiplier.toFixed(2).replace(/\.00$/, '')} mode = {player.lastRun.xpEarned} XP
            </p>
          )}
          {player?.lastRun?.relaxed && <p className="relaxed-label">Relaxed Run</p>}
          {player?.coins === 0 && <p className="empty-state">Complete daily challenges to earn coins for hints.</p>}
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
