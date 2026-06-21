import { useState } from 'react'

function UserSetup({ onConfirm }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!username.trim()) {
      setError('Please enter a name')
      return
    }
    onConfirm(username.trim())
  }

  return (
    <main className="screen setup-screen">
      <div className="setup-glow" aria-hidden="true" />
      <section className="setup-card">
        <div className="brand-mark" aria-hidden="true">W</div>
        <p className="eyebrow">Five games. One vocabulary.</p>
        <h1 className="setup-title">WORDMASTER</h1>
        <p className="setup-copy">Build chains, crack anagrams, and master every letter.</p>
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">What&apos;s your name?</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => { setUsername(event.target.value); setError('') }}
            placeholder="Enter name..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck="false"
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn-primary" type="submit">LET&apos;S PLAY</button>
        </form>
      </section>
    </main>
  )
}

export default UserSetup
