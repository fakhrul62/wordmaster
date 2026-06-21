import LevelBadge from './LevelBadge'
import { getRank } from '../utils/wordUtils'

const GAMES = [
  { key: 'wordchain', icon: '⛓', name: 'WordChain', desc: 'Link words before the clock runs out.', color: 'purple' },
  { key: 'anagramvault', icon: '↻', name: 'Anagram Vault', desc: 'Unscramble the letters and crack the vault.', color: 'pink' },
  { key: 'crossclue', icon: '✣', name: 'CrossClue', desc: 'Solve compact crosswords one clue at a time.', color: 'cyan' },
  { key: 'wordshrink', icon: '▽', name: 'WordShrink', desc: 'Remove one letter and keep making words.', color: 'gold' },
  { key: 'letterlock', icon: '⬡', name: 'LetterLock', desc: 'Find every word hidden in the letter ring.', color: 'green' },
]

function Stars() {
  return (
    <div className="stars" aria-hidden="true">
      {Array.from({ length: 20 }, (_, index) => (
        <i key={index} style={{
          left: `${(index * 37) % 100}%`,
          top: `${(index * 53) % 100}%`,
          animationDelay: `${(index % 7) * 0.6}s`,
        }} />
      ))}
    </div>
  )
}

function HomeScreen({ player, onPlayGame, onSwitchPlayer, getLeaderboard }) {
  const leaderboard = getLeaderboard()
  return (
    <main className="screen home-screen">
      <Stars />
      <header className="home-topbar">
        <div>
          <span className="wordmark">WORDMASTER</span>
          <span className="player-line">{getRank(player.totalXP)} · {player.username} · {player.totalXP} XP</span>
        </div>
        <button className="icon-button" onClick={onSwitchPlayer} aria-label="Switch player">⇄</button>
      </header>
      <div className="home-content">
        <section className="home-intro">
          <p className="eyebrow">Choose your challenge</p>
          <h1>Train your word instincts.</h1>
          <p>Five games, endless levels, saved right on this device.</p>
        </section>
        <section className="game-grid" aria-label="Word games">
          {GAMES.map((game, index) => {
            const progress = player.games[game.key]
            return (
              <article className={`game-card card-${game.color}`} style={{ animationDelay: `${index * 70}ms` }} key={game.key}>
                <div className="game-card-header">
                  <span className="game-card-icon" aria-hidden="true">{game.icon}</span>
                  <LevelBadge level={progress.level} />
                </div>
                <div><h2>{game.name}</h2><p className="game-card-desc">{game.desc}</p></div>
                <div className="card-stat"><span>Best</span><strong>{progress.highScore}</strong></div>
                <button className="btn-primary" onClick={() => onPlayGame(game.key)}>PLAY</button>
              </article>
            )
          })}
        </section>
        <section className="leaderboard-panel">
          <div className="section-heading"><p className="eyebrow">Local legends</p><h2>Leaderboard</h2></div>
          {leaderboard.length ? (
            <div className="table-scroll">
              <table className="leaderboard">
                <thead><tr><th>#</th><th>Player</th><th className="col-title">Title</th><th>XP</th></tr></thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={entry.username}>
                      <td>{index + 1}</td><td>{entry.username}</td>
                      <td className="col-title">{getRank(entry.totalXP)}</td><td>{entry.totalXP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">Complete a game to claim the first spot.</p>}
        </section>
      </div>
    </main>
  )
}

export default HomeScreen
