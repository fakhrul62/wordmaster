import { forwardRef } from 'react'
import { GAME_NAMES } from '../data/gameCatalog'

const ShareCard = forwardRef(function ShareCard({
  gameKey,
  result = null,
  player = null,
  level = 1,
}, ref) {
  const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="share-card-host" aria-hidden="true">
      <section className="share-card" ref={ref}>
        <div className="share-card-mark">W</div>
        <div>
          <p>WordMaster</p>
          <h2>{GAME_NAMES[gameKey] || 'Word Game'}</h2>
        </div>
        <div className="share-card-score">
          <span>Score</span>
          <strong>{result?.score || 0}</strong>
        </div>
        <div className="share-card-grid">
          <span>Level {level}</span>
          <span>{result?.xp || 0} XP</span>
          <span>{player?.activeTitle || 'Beginner Explorer'}</span>
          <span>{date}</span>
        </div>
      </section>
    </div>
  )
})

export default ShareCard
