// Web Audio API Sound Effects Generator
// Provides tactile, latency-free synthesized sounds for mobile gameplay

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// Global sound mute state
let soundEnabled = true

export function setSoundEnabled(enabled) {
  soundEnabled = enabled
  try {
    localStorage.setItem('imposter_sound_enabled', enabled ? 'true' : 'false')
  } catch {
    // ignore
  }
}

export function isSoundEnabled() {
  try {
    const saved = localStorage.getItem('imposter_sound_enabled')
    if (saved !== null) {
      soundEnabled = saved === 'true'
    }
  } catch {
    // ignore
  }
  return soundEnabled
}

// Light click sound for buttons
export function playClickSound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(600, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05)

  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.05)
}

// Card flip swoosh
export function playCardFlipSound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(220, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.12)

  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.14)
}

// Tension reveal sound when card is viewed
export function playRevealSound(isImposter = false) {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  if (isImposter) {
    // Low dramatic drone
    osc1.type = 'sawtooth'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(140, now)
    osc1.frequency.exponentialRampToValueAtTime(110, now + 0.3)
    osc2.frequency.setValueAtTime(70, now)

    gain.gain.setValueAtTime(0.25, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
  } else {
    // Bright chime
    osc1.type = 'sine'
    osc2.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now) // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1) // E5
    osc2.frequency.setValueAtTime(783.99, now + 0.1) // G5

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
  }

  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  osc1.start(now)
  osc2.start(now)
  osc1.stop(now + 0.4)
  osc2.stop(now + 0.4)
}

// Timer tick sound
export function playTickSound(isUrgent = false) {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = isUrgent ? 'sawtooth' : 'sine'
  osc.frequency.setValueAtTime(isUrgent ? 880 : 440, ctx.currentTime)

  gain.gain.setValueAtTime(isUrgent ? 0.2 : 0.08, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.06)
}

// Victory fanfare
export function playVictorySound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const notes = [440, 554.37, 659.25, 880] // A major arpeggio
  const now = ctx.currentTime

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now + idx * 0.1)

    gain.gain.setValueAtTime(0.2, now + idx * 0.1)
    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * 0.1)
    osc.stop(now + idx * 0.1 + 0.25)
  })
}

// Uno: Card play snap
export function playCardPlaySound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.setValueAtTime(400, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.07)

  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.07)
}

// Uno: Card draw swoosh
export function playCardDrawSound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'triangle'
  osc.frequency.setValueAtTime(240, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(360, ctx.currentTime + 0.09)

  gain.gain.setValueAtTime(0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09)

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start()
  osc.stop(ctx.currentTime + 0.09)
}

// Uno: Action card effect (Reverse, Skip, +2, +4)
export function playActionCardSound(isPenalty = false) {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = isPenalty ? 'sawtooth' : 'triangle'
  if (isPenalty) {
    osc.frequency.setValueAtTime(350, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.18)
  } else {
    osc.frequency.setValueAtTime(300, now)
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.12)
  }

  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + (isPenalty ? 0.2 : 0.14))

  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + (isPenalty ? 0.2 : 0.14))
}

// Uno: Dramatic UNO shout chime
export function playUnoCallSound() {
  if (!soundEnabled) return
  const ctx = getAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const freqs = [523.25, 659.25, 1046.5] // C5, E5, C6
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now + idx * 0.08)

    gain.gain.setValueAtTime(0.22, now + idx * 0.08)
    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now + idx * 0.08)
    osc.stop(now + idx * 0.08 + 0.25)
  })
}

