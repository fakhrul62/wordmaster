function ScoreBar({
  score = 0,
  xp = 0,
  label = 'Score',
  xpMultiplier = 1,
  streakMultiplier = 1,
  streakCount = 0,
}) {
  return (
    <div className="score-bar" aria-label={`${label}: ${score}. Experience: ${xp}`}>
      <span><small>{label}</small><strong>{score}</strong></span>
      <span className="score-divider" aria-hidden="true" />
      <span><small>XP</small><strong>{xp}</strong></span>
      {xpMultiplier !== 1 && (
        <>
          <span className="score-divider" aria-hidden="true" />
          <span className="xp-multiplier-badge"><small>Bonus</small><strong>x{xpMultiplier.toFixed(2).replace(/\.00$/, '')}</strong></span>
        </>
      )}
      {streakMultiplier > 1 && (
        <span
          className="streak-badge"
          title={`${streakCount}-day login streak bonus active`}
          aria-label={`${streakCount}-day login streak bonus active`}
        >
          <small>Streak</small><strong>🔥 x{streakMultiplier.toFixed(2).replace(/\.00$/, '')}</strong>
        </span>
      )}
    </div>
  )
}

export default ScoreBar
