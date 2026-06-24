export const HAPTICS_STORAGE_KEY = 'wordmaster_haptics_enabled'

export function readHapticsPreference() {
  try {
    return localStorage.getItem(HAPTICS_STORAGE_KEY) !== 'false'
  } catch {
    return true
  }
}

export function writeHapticsPreference(enabled) {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
    // Haptics still works for the current session when storage is unavailable.
  }
}

export function triggerHaptic(enabled, pattern = 12) {
  if (!enabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
  return navigator.vibrate(pattern)
}
