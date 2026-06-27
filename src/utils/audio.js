export const SOUND_STORAGE_KEY = 'wordmaster_sound_enabled'

let audioContext = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioCtor) return null
  if (!audioContext) audioContext = new AudioCtor()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

export function readSoundPreference() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function writeSoundPreference(enabled) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    // Sound still works for this session when storage is unavailable.
  }
}

function playTone(context, {
  type = 'sine',
  frequency = 440,
  endFrequency = frequency,
  duration = 0.08,
  delay = 0,
  gain = 0.06,
  sustain = 0,
}) {
  const startAt = context.currentTime + delay
  const endAt = startAt + duration + sustain
  const oscillator = context.createOscillator()
  const volume = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), startAt + Math.max(0.01, duration))

  volume.gain.setValueAtTime(0.0001, startAt)
  volume.gain.exponentialRampToValueAtTime(gain, startAt + 0.012)
  if (sustain) volume.gain.setValueAtTime(gain * 0.8, startAt + duration)
  volume.gain.exponentialRampToValueAtTime(0.0001, endAt)

  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(endAt + 0.02)
}

export function playSound(type, enabled = readSoundPreference()) {
  if (!enabled) return false
  const context = getAudioContext()
  if (!context) return false

  const sounds = {
    key: () => playTone(context, { type: 'sine', frequency: 220, endFrequency: 200, duration: 0.05, gain: 0.035 }),
    correct: () => playTone(context, { type: 'sine', frequency: 440, endFrequency: 660, duration: 0.15, gain: 0.07 }),
    wrong: () => playTone(context, { type: 'square', frequency: 140, endFrequency: 80, duration: 0.12, gain: 0.045 }),
    streak: () => [440, 550, 660].forEach((frequency, index) =>
      playTone(context, { type: 'sine', frequency, duration: 0.05, delay: index * 0.055, gain: 0.055 })),
    level_up: () => playTone(context, {
      type: 'sine',
      frequency: 523,
      endFrequency: 784,
      duration: 0.14,
      sustain: 0.06,
      gain: 0.08,
    }),
    coin: () => playTone(context, { type: 'triangle', frequency: 880, duration: 0.08, gain: 0.065 }),
  }

  sounds[type]?.()
  return Boolean(sounds[type])
}
