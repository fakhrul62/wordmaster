const TECH_WORDS = [
  'array', 'async', 'binary', 'branch', 'cache', 'cipher', 'client', 'cloud', 'compile', 'cookie',
  'debug', 'deploy', 'docker', 'domain', 'export', 'fiber', 'github', 'import', 'kernel', 'lambda',
  'module', 'object', 'packet', 'parser', 'python', 'queue', 'react', 'router', 'schema', 'script',
  'server', 'socket', 'string', 'syntax', 'token', 'vector', 'widget',
]

const FOOD_WORDS = [
  'apple', 'baker', 'basil', 'beans', 'bread', 'broil', 'candy', 'chili', 'cocoa', 'cream',
  'curry', 'diner', 'dough', 'flour', 'grape', 'grill', 'honey', 'juice', 'knife', 'lemon',
  'mango', 'melon', 'noodle', 'olive', 'onion', 'pasta', 'peach', 'pizza', 'plate', 'salad',
  'sauce', 'spice', 'spoon', 'sugar', 'sushi', 'toast',
]

const SPORTS_WORDS = [
  'arena', 'baton', 'coach', 'court', 'derby', 'draft', 'field', 'final', 'glove', 'guard',
  'homer', 'jumps', 'league', 'medal', 'match', 'pitch', 'racer', 'rally', 'relay', 'round',
  'score', 'serve', 'skate', 'squad', 'swims', 'tackle', 'teams', 'throw', 'track', 'train',
  'vault',
]

const NATURE_WORDS = [
  'acorn', 'beach', 'bloom', 'brook', 'cedar', 'cloud', 'coral', 'creek', 'daisy', 'earth',
  'fern', 'field', 'flora', 'forest', 'glade', 'grove', 'heron', 'hills', 'leafy', 'mossy',
  'ocean', 'petal', 'river', 'roots', 'stone', 'storm', 'sunny', 'tiger', 'trail', 'valley',
  'water',
]

const CINEMA_WORDS = [
  'actor', 'audio', 'cameo', 'camera', 'cinema', 'comedy', 'credit', 'director', 'drama', 'frame',
  'genre', 'horror', 'lights', 'movie', 'poster', 'reel', 'scene', 'screen', 'script', 'sequel',
  'series', 'sound', 'stage', 'studio', 'take', 'teaser', 'ticket', 'trailer', 'video',
]

export const WORD_PACKS = [
  { id: 'tech', name: 'Tech & Code', cost: 150, icon: '💻', words: TECH_WORDS },
  { id: 'food', name: 'Food & Kitchen', cost: 120, icon: '🍳', words: FOOD_WORDS },
  { id: 'sports', name: 'Sports', cost: 120, icon: '⚽', words: SPORTS_WORDS },
  { id: 'nature', name: 'Nature', cost: 100, icon: '🌿', words: NATURE_WORDS },
  { id: 'cinema', name: 'Film & TV', cost: 150, icon: '🎬', words: CINEMA_WORDS },
]
