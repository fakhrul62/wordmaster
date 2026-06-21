import LevelBadge from './LevelBadge'

const GAME_NAMES = {
  wordchain: 'WordChain',
  anagramvault: 'Anagram Vault',
  crossclue: 'CrossClue',
  wordshrink: 'WordShrink',
  letterlock: 'LetterLock',
}

function GameWrapper({ gameKey, level, onBack }) {
  function leaveGame() {
    if (window.confirm('Leave this game? Current level progress will be lost.')) onBack()
  }

  return (
    <main className="screen game-wrapper">
      <header className="game-topbar">
        <button className="back-button" onClick={leaveGame}>← Back</button>
        <strong>{GAME_NAMES[gameKey]}</strong>
        <LevelBadge level={level} />
      </header>
      <section className="game-content">
        <div className="game-placeholder">
          <span className="game-card-icon">◇</span>
          <h1>{GAME_NAMES[gameKey]}</h1>
          <p>Game engine loading in the next build step.</p>
        </div>
      </section>
    </main>
  )
}

export default GameWrapper
