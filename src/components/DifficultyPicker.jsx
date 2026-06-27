import { DIFFICULTIES, getDifficultyMultiplier } from '../utils/progression'

const LABELS = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
}

function DifficultyPicker({
  difficulty = 'normal',
  timerMode = true,
  activePack = 'default',
  unlockedPacks = [],
  packs = [],
  onDifficultyChange,
  onTimerModeChange,
  onPackChange,
}) {
  const packOptions = [
    { id: 'default', name: 'Default' },
    ...packs.filter((pack) => unlockedPacks.includes(pack.id)),
  ]

  return (
    <section className="difficulty-picker" aria-label="Run settings">
      <div className="settings-group">
        <h3>Difficulty</h3>
        <div className="segmented-control segmented-three">
          {DIFFICULTIES.map((item) => (
            <button
              className={difficulty === item ? 'selected' : ''}
              key={item}
              onClick={() => onDifficultyChange?.(item)}
              aria-pressed={difficulty === item}
            >
              {LABELS[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-group">
        <h3>Timer Mode</h3>
        <div className="segmented-control">
          <button
            className={timerMode ? 'selected' : ''}
            onClick={() => onTimerModeChange?.(true)}
            aria-pressed={timerMode}
          >
            Timed
          </button>
          <button
            className={!timerMode ? 'selected' : ''}
            onClick={() => onTimerModeChange?.(false)}
            aria-pressed={!timerMode}
          >
            Relaxed
          </button>
        </div>
      </div>
      <label className="pack-select-row">
        <span>Word Pack</span>
        <select value={activePack} onChange={(event) => onPackChange?.(event.target.value)}>
          {packOptions.map((pack) => (
            <option key={pack.id} value={pack.id}>{pack.name}</option>
          ))}
        </select>
      </label>
      <div className="run-badges" aria-label="Active reward modifiers">
        <span>{timerMode ? 'Timed rewards' : 'Relaxed x0.6 XP'}</span>
        <span>x{getDifficultyMultiplier(difficulty).toFixed(2).replace(/\.00$/, '')} XP</span>
      </div>
    </section>
  )
}

export default DifficultyPicker
