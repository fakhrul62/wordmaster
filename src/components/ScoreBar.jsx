function ScoreBar({ score = 0, xp = 0, label = 'Score' }) {
  return (
    <div className="score-bar" aria-label={`${label}: ${score}. Experience: ${xp}`}>
      <span><small>{label}</small><strong>{score}</strong></span>
      <span className="score-divider" aria-hidden="true" />
      <span><small>XP</small><strong>{xp}</strong></span>
    </div>
  )
}

export default ScoreBar
