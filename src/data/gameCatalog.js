export const GAME_CATALOG = [
  {
    key: 'wordchain',
    icon: '⛓',
    name: 'WordChain',
    shortName: 'Chain',
    desc: 'Link words before the clock runs out.',
    color: 'purple',
  },
  {
    key: 'anagramvault',
    icon: '↻',
    name: 'Anagram Vault',
    shortName: 'Vault',
    desc: 'Unscramble the letters and crack the vault.',
    color: 'pink',
  },
  {
    key: 'crossclue',
    icon: '✣',
    name: 'CrossClue',
    shortName: 'Clue',
    desc: 'Solve compact crosswords one clue at a time.',
    color: 'cyan',
  },
  {
    key: 'wordshrink',
    icon: '▽',
    name: 'WordShrink',
    shortName: 'Shrink',
    desc: 'Remove one letter and keep making words.',
    color: 'gold',
  },
  {
    key: 'letterlock',
    icon: '⬡',
    name: 'LetterLock',
    shortName: 'Lock',
    desc: 'Find every word hidden in the letter ring.',
    color: 'green',
  },
  {
    key: 'wordle',
    icon: '▦',
    name: 'Wordle',
    shortName: 'Wordle',
    desc: 'Guess the hidden word in six tries.',
    color: 'cyan',
  },
  {
    key: 'boggle',
    icon: '✦',
    name: 'Boggle',
    shortName: 'Boggle',
    desc: 'Trace connected words before time expires.',
    color: 'purple',
  },
]

export const GAME_KEYS = GAME_CATALOG.map(({ key }) => key)

export const GAME_NAMES = Object.fromEntries(GAME_CATALOG.map(({ key, name }) => [key, name]))

export const getGameMeta = (gameKey) =>
  GAME_CATALOG.find(({ key }) => key === gameKey) || GAME_CATALOG[0]
