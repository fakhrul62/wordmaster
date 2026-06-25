# WordMaster

WordMaster is a free, mobile-first collection of browser word games:

- WordChain
- Anagram Vault
- CrossClue
- WordShrink
- LetterLock
- Wordle
- Boggle

Progress, daily streaks, daily challenges, achievements, titles, coins, XP, points, and local leaderboard data are stored per player in `localStorage`. Optional account sync is available through the `/api/player` endpoint when MongoDB environment variables are configured.

## Retention systems

- Independent levels for every mini-game.
- Daily login streak rewards.
- Rotating daily challenges.
- Limited-time special events with missions and event currency.
- Achievement-based title unlocks.
- Global-style and local friends leaderboard surfaces.
- Player dashboard with milestones and recent rewards.

## Run locally

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run lint
npm run build
```

Built with React, Vite, plain JavaScript, and handwritten CSS.
