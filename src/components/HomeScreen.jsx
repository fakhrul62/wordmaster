import LevelBadge from './LevelBadge'
import { GAME_CATALOG } from '../data/gameCatalog'
import {
  ACHIEVEMENTS,
  BOGGLE_MODES,
  getEventProgress,
  getGameTrack,
  getPlayerLevel,
  getTitleForXP,
  getUpcomingMilestones,
} from '../utils/progression'

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

function StatCard({ label, value, detail }) {
  return (
    <article className="dashboard-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  )
}

function ProgressBar({ value, max, label }) {
  const percent = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mini-progress" aria-label={label}>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

function HomeScreen({ player, onPlayGame, onSwitchPlayer, getLeaderboard }) {
  const leaderboard = getLeaderboard()
  const playerLevel = getPlayerLevel(player.totalXP)
  const eventProgress = getEventProgress(player)
  const milestones = getUpcomingMilestones(player)
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) => player.achievements.includes(achievement.id))
  const activeTitle = player.activeTitle || getTitleForXP(player.totalXP)
  const dailyChallenges = player.daily?.challenges || []
  const completedDailies = dailyChallenges.filter((challenge) => challenge.completed).length

  return (
    <main className="screen home-screen">
      <Stars />
      <header className="home-topbar">
        <div>
          <span className="wordmark">WORDMASTER</span>
          <span className="player-line">{activeTitle} · {player.username} · Rank #{leaderboard.playerRank}</span>
        </div>
        <button className="icon-button" onClick={onSwitchPlayer} aria-label="Switch player">⇄</button>
      </header>

      <div className="home-content">
        <section className="dashboard-hero" aria-label="Player progress dashboard">
          <div className="dashboard-identity">
            <p className="eyebrow">Player dashboard</p>
            <h1>{activeTitle}</h1>
            <p>{player.username}</p>
          </div>
          <div className="overall-level">
            <span>LV {playerLevel.level}</span>
            <ProgressBar value={playerLevel.currentXP} max={playerLevel.nextXP} label="Overall level progress" />
            <small>{playerLevel.currentXP}/{playerLevel.nextXP} XP to next level</small>
          </div>
        </section>

        <section className="dashboard-grid" aria-label="Progress summary">
          <StatCard label="Coins" value={player.coins} detail="Spendable rewards" />
          <StatCard label="XP" value={player.totalXP} detail="Overall growth" />
          <StatCard label="Points" value={player.totalPoints} detail="Leaderboard score" />
          <StatCard label="Streak" value={`${player.streak.count}d`} detail={`Best ${player.streak.best}d`} />
        </section>

        <section className="engagement-grid">
          <article className="engagement-panel">
            <div className="section-heading">
              <p className="eyebrow">Today</p>
              <h2>Daily Challenges</h2>
              <span>{completedDailies}/{dailyChallenges.length} complete</span>
            </div>
            <div className="challenge-list">
              {dailyChallenges.map((challenge) => (
                <div className={`challenge-item ${challenge.completed ? 'completed' : ''}`} key={challenge.id}>
                  <div>
                    <strong>{challenge.title}</strong>
                    <small>{challenge.description}</small>
                  </div>
                  <span>+{challenge.reward.coins}c</span>
                </div>
              ))}
            </div>
          </article>

          <article className={`engagement-panel event-${eventProgress.event.accent}`}>
            <div className="section-heading">
              <p className="eyebrow">Limited event</p>
              <h2>{eventProgress.event.name}</h2>
              <span>Ends {eventProgress.event.endsAt}</span>
            </div>
            <div className="challenge-list">
              {eventProgress.missions.map((mission) => (
                <div className={`challenge-item ${mission.completed ? 'completed' : ''}`} key={mission.id}>
                  <div>
                    <strong>{mission.title}</strong>
                    <small>{mission.description}</small>
                    <ProgressBar value={mission.progress} max={mission.target} label={`${mission.title} progress`} />
                  </div>
                  <span>{mission.progress}/{mission.target}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section aria-label="Word games">
          <div className="section-heading">
            <p className="eyebrow">Independent levels</p>
            <h2>Mini-Games</h2>
          </div>
          <div className="game-grid">
            {GAME_CATALOG.map((game, index) => {
              const progress = player.games[game.key] || { level: 1, highScore: 0, xp: 0, clears: 0 }
              const selectedMode = game.key === 'boggle' ? progress.selectedMode || 3 : null
              const displayProgress = getGameTrack(progress, game.key, selectedMode)
              const nextReward = displayProgress.level * 10
              return (
                <article className={`game-card card-${game.color}`} style={{ animationDelay: `${index * 70}ms` }} key={game.key}>
                  <div className="game-card-header">
                    <span className="game-card-icon" aria-hidden="true">{game.icon}</span>
                    <LevelBadge level={displayProgress.level} />
                  </div>
                  <div>
                    <h2>{game.name}</h2>
                    <p className="game-card-desc">{game.desc}</p>
                  </div>
                  {game.key === 'boggle' && (
                    <div className="boggle-track-summary" aria-label="Boggle mode levels">
                      {BOGGLE_MODES.map((mode) => {
                        const track = getGameTrack(progress, game.key, mode)
                        return <span className={selectedMode === mode ? 'selected' : ''} key={mode}>{mode}+ LV {track.level}</span>
                      })}
                    </div>
                  )}
                  <div className="card-stat">
                    <span>{game.key === 'boggle' ? `${selectedMode}+ best` : 'Best'} {displayProgress.highScore}</span>
                    <strong>+{nextReward} XP</strong>
                  </div>
                  <button className="btn-primary" onClick={() => onPlayGame(game.key)}>PLAY</button>
                </article>
              )
            })}
          </div>
        </section>

        <section className="retention-grid">
          <article className="engagement-panel">
            <div className="section-heading">
              <p className="eyebrow">Achievements</p>
              <h2>Titles</h2>
              <span>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
            </div>
            <div className="achievement-list">
              {ACHIEVEMENTS.slice(0, 6).map((achievement) => {
                const unlocked = player.achievements.includes(achievement.id)
                return (
                  <div className={`achievement-chip ${unlocked ? 'unlocked' : ''}`} key={achievement.id}>
                    <strong>{achievement.rewardTitle}</strong>
                    <small>{achievement.description}</small>
                  </div>
                )
              })}
            </div>
          </article>

          <article className="engagement-panel">
            <div className="section-heading">
              <p className="eyebrow">Next goals</p>
              <h2>Milestones</h2>
            </div>
            <div className="challenge-list">
              {milestones.map((milestone) => (
                <div className="challenge-item" key={milestone.title}>
                  <div>
                    <strong>{milestone.title}</strong>
                    <small>{milestone.detail}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="engagement-panel recent-panel">
            <div className="section-heading">
              <p className="eyebrow">Recently unlocked</p>
              <h2>Rewards</h2>
            </div>
            <div className="challenge-list">
              {player.recentUnlocks.length ? player.recentUnlocks.slice(0, 4).map((unlock) => (
                <div className="challenge-item completed" key={unlock.id}>
                  <div>
                    <strong>{unlock.title}</strong>
                    <small>{unlock.detail}</small>
                  </div>
                </div>
              )) : <p className="empty-state">Rewards will appear here as you play.</p>}
            </div>
          </article>
        </section>

        <section className="leaderboard-panel">
          <div className="section-heading">
            <p className="eyebrow">Global ranking</p>
            <h2>Leaderboard</h2>
            <span>Your position #{leaderboard.playerRank} of {leaderboard.totalPlayers}</span>
          </div>
          {leaderboard.entries.length ? (
            <div className="table-scroll">
              <table className="leaderboard">
                <thead><tr><th>#</th><th>Player</th><th className="col-title">Title</th><th>Points</th><th>XP</th></tr></thead>
                <tbody>
                  {leaderboard.entries.map((entry, index) => (
                    <tr className={entry.username === player.username ? 'current-player' : ''} key={`${entry.username}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{entry.username}</td>
                      <td className="col-title">{entry.activeTitle || getTitleForXP(entry.totalXP)}</td>
                      <td>{entry.totalPoints || 0}</td>
                      <td>{entry.totalXP}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">Complete a game to claim the first spot.</p>}
          <div className="friends-rankings" aria-label="Friends rankings">
            <strong>Friends</strong>
            {leaderboard.friends.length ? leaderboard.friends.map((friend, index) => (
              <span key={friend.username}>#{index + 1} {friend.username} · {friend.totalPoints || 0} pts</span>
            )) : <span>Local friends appear here after they create profiles on this device.</span>}
          </div>
        </section>
      </div>
    </main>
  )
}

export default HomeScreen
