import { WORD_PACKS } from '../data/wordPacks'

function WordPackStore({ player, onUnlock, onClose }) {
  return (
    <div className="store-overlay" role="dialog" aria-modal="true" aria-labelledby="pack-store-title">
      <section className="store-panel">
        <div className="section-heading">
          <p className="eyebrow">Word packs</p>
          <h2 id="pack-store-title">Pack Store</h2>
          <button className="home-icon-button" onClick={onClose} aria-label="Close word pack store">×</button>
        </div>
        <div className="pack-grid">
          {WORD_PACKS.map((pack) => {
            const owned = player.unlockedPacks?.includes(pack.id)
            return (
              <article className="pack-card" key={pack.id}>
                <span className="pack-icon">{pack.icon}</span>
                <div>
                  <h3>{pack.name}</h3>
                  <small>{pack.words.length} words</small>
                </div>
                <button
                  className={owned ? 'btn-secondary' : 'btn-primary'}
                  onClick={() => !owned && onUnlock?.(pack)}
                  disabled={owned}
                >
                  {owned ? 'ACTIVE' : `${pack.cost} COINS`}
                </button>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default WordPackStore
