import { useState } from 'react'
import { writeSoundPreference } from '../utils/audio'
import { writeHapticsPreference } from '../utils/haptics'

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

function SettingsScreen({ player, settings, onChange, onConnectAccount, syncStatus, syncError, onBack }) {
  const [email, setEmail] = useState(player?.accountEmail || '')
  const [accountError, setAccountError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(partial) {
    onChange((current) => ({ ...current, ...partial }))
  }

  function setSound(enabled) {
    writeSoundPreference(enabled)
    update({ soundEnabled: enabled })
  }

  function setHaptics(enabled) {
    writeHapticsPreference(enabled)
    update({ hapticsEnabled: enabled })
  }

  async function submitAccount(event) {
    event.preventDefault()
    setSaving(true)
    setAccountError('')
    try {
      await onConnectAccount(email)
    } catch (error) {
      setAccountError(error.message)
    } finally {
      setSaving(false)
    }
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
            <h3>Account</h3>
            <form className="account-form" onSubmit={submitAccount} noValidate>
              <label htmlFor="account-email">Email</label>
              <div className="account-row">
                <input
                  id="account-email"
                  type="email"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setAccountError('') }}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? 'SAVING' : player?.accountEmail ? 'SYNC' : 'SAVE'}
                </button>
              </div>
              <p className={`account-status ${syncStatus === 'error' || accountError ? 'error' : ''}`}>
                {accountError || syncError || (player?.accountEmail
                  ? `Saving to ${player.accountEmail}`
                  : 'Playing as guest. Progress is saved on this device.')}
              </p>
            </form>
          </div>
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
            <h3>Sound</h3>
            <div className="segmented-control">
              {[true, false].map((enabled) => (
                <button
                  className={settings.soundEnabled === enabled ? 'selected' : ''}
                  key={enabled ? 'sound-on' : 'sound-off'}
                  onClick={() => setSound(enabled)}
                  aria-pressed={settings.soundEnabled === enabled}
                >
                  {enabled ? 'ON' : 'OFF'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group">
            <h3>Haptics</h3>
            <div className="segmented-control">
              {[true, false].map((enabled) => (
                <button
                  className={settings.hapticsEnabled === enabled ? 'selected' : ''}
                  key={enabled ? 'haptics-on' : 'haptics-off'}
                  onClick={() => setHaptics(enabled)}
                  aria-pressed={settings.hapticsEnabled === enabled}
                >
                  {enabled ? 'ON' : 'OFF'}
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
