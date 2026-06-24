const MODE_OPTIONS = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
]

const COLOR_OPTIONS = [
  { key: 'violet', label: 'Violet' },
  { key: 'blue', label: 'Blue' },
  { key: 'green', label: 'Green' },
  { key: 'rose', label: 'Rose' },
  { key: 'gold', label: 'Gold' },
]

function SettingsScreen({ settings, onChange, onBack }) {
  function update(partial) {
    onChange((current) => ({ ...current, ...partial }))
  }

  return (
    <main className="screen settings-screen">
      <header className="game-topbar">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1 className="game-topbar-title">Settings</h1>
        <span className="topbar-spacer" aria-hidden="true" />
      </header>
      <section className="settings-content" aria-labelledby="settings-title">
        <div className="section-heading">
          <p className="eyebrow">Display</p>
          <h2 id="settings-title">Theme</h2>
        </div>
        <section className="settings-panel">
          <div className="settings-group">
            <h3>Mode</h3>
            <div className="segmented-control">
              {MODE_OPTIONS.map((option) => (
                <button
                  className={settings.mode === option.key ? 'selected' : ''}
                  key={option.key}
                  onClick={() => update({ mode: option.key })}
                  aria-pressed={settings.mode === option.key}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group">
            <h3>Color</h3>
            <div className="color-options">
              {COLOR_OPTIONS.map((option) => (
                <button
                  className={`color-choice color-${option.key} ${settings.color === option.key ? 'selected' : ''}`}
                  key={option.key}
                  onClick={() => update({ color: option.key })}
                  aria-label={`${option.label} theme color`}
                  aria-pressed={settings.color === option.key}
                >
                  <span aria-hidden="true" />
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

export default SettingsScreen
