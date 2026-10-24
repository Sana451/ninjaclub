// Звук ниндзя-рана: эффекты и chiptune-музыка синтезируются через Web Audio (без файлов),
// озвучка фраз — встроенный speechSynthesis (ru-RU).

const TEMPO = 140
const STEP = 60 / TEMPO / 2
const BASS = [
  110, 110, 110, 110, 87.31, 87.31, 87.31, 87.31, 130.81, 130.81, 130.81,
  130.81, 98, 98, 98, 98,
]
const LEAD = [
  440, 0, 523.25, 0, 659.25, 0, 523.25, 0, 587.33, 0, 523.25, 0, 493.88, 0, 440,
  0,
]

let ctx = null
let master = null
let muted = false
let wantMusic = false
let playing = false
let timer = 0
let nextT = 0
let step = 0

try {
  muted = localStorage.getItem("nk-mute") === "1"
} catch (_e) {
  /* storage недоступен */
}

const ensure = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.6
    master.connect(ctx.destination)
  }
  if (ctx.state === "suspended") ctx.resume()
  return ctx
}

const tone = (f, at, dur, type = "square", vol = 0.2, slideTo = 0) => {
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f, at)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur)
  g.gain.setValueAtTime(vol, at)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(master)
  o.start(at)
  o.stop(at + dur + 0.02)
}

const SFX = {
  start: (t) => {
    ;[523.25, 659.25, 783.99].forEach((f, i) => {
      tone(f, t + i * 0.07, 0.12, "square", 0.14)
    })
  },
  jump: (t) => tone(300, t, 0.18, "square", 0.15, 900),
  land: (t) => tone(120, t, 0.06, "triangle", 0.2, 60),
  zip: (t) => tone(600, t, 0.3, "sawtooth", 0.08, 1400),
  ring: (t) => {
    tone(988, t, 0.08, "square", 0.12)
    tone(1319, t + 0.07, 0.12, "square", 0.12)
  },
  hit: (t) => tone(200, t, 0.35, "sawtooth", 0.25, 40),
  tick: (t) => tone(880, t, 0.04, "square", 0.1),
  add: (t) => {
    tone(523, t, 0.08, "square", 0.12)
    tone(784, t + 0.08, 0.12, "square", 0.12)
  },
  remove: (t) => tone(330, t, 0.12, "square", 0.12, 140),
  go: (t) => {
    tone(440, t, 0.1, "square", 0.12)
    tone(660, t + 0.1, 0.1, "square", 0.12)
    tone(880, t + 0.2, 0.18, "square", 0.12)
  },
  back: (t) => tone(500, t, 0.12, "triangle", 0.15, 250),
  next: (t) => {
    tone(660, t, 0.08, "square", 0.12)
    tone(990, t + 0.08, 0.14, "square", 0.12)
  },
}

export function sfx(name) {
  if (muted || !ensure()) return
  SFX[name]?.(ctx.currentTime + 0.005)
}

const sched = () => {
  while (nextT < ctx.currentTime + 0.12) {
    const i = step % 16
    tone(BASS[i], nextT, STEP * 0.9, "triangle", 0.35)
    if (LEAD[i]) tone(LEAD[i], nextT, STEP * 0.8, "square", 0.08)
    nextT += STEP
    step++
  }
}

const startLoop = () => {
  if (playing || muted || !ensure()) return
  playing = true
  nextT = ctx.currentTime + 0.05
  step = 0
  sched()
  timer = setInterval(sched, 25)
}

const stopLoop = () => {
  playing = false
  clearInterval(timer)
}

export function music(on) {
  wantMusic = on
  if (on) startLoop()
  else stopLoop()
}

let lastUtterance = null

export function say(text) {
  if (muted || !("speechSynthesis" in window)) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = "ru-RU"
  u.rate = 1.15
  u.pitch = 1.1
  const voice = synth.getVoices().find((v) => v.lang.startsWith("ru"))
  if (voice) u.voice = voice
  lastUtterance = u
  u.onend = () => {
    if (lastUtterance === u) lastUtterance = null
  }
  synth.speak(u)
}

export function stopAll() {
  stopLoop()
  wantMusic = false
  if ("speechSynthesis" in window) window.speechSynthesis.cancel()
}

const crowd = (at, dur) => {
  const len = Math.floor(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  const bp = ctx.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 1400
  bp.Q.value = 0.6
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.5, at + 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  src.connect(bp).connect(g).connect(master)
  src.start(at)
  src.stop(at + dur + 0.02)
}

export function victory() {
  if (muted || !ensure()) return
  stopLoop()
  const t0 = ctx.currentTime + 0.05
  const melody = [
    [523.25, 0],
    [659.25, 0.2],
    [783.99, 0.4],
    [1046.5, 0.6],
    [783.99, 0.9],
    [1046.5, 1.05],
    [1318.5, 1.2],
    [1046.5, 1.6],
  ]
  for (const [f, d] of melody) tone(f, t0 + d, 0.26, "square", 0.14)
  const chords = [
    [261.63, 0],
    [392, 0.9],
    [523.25, 1.2],
  ]
  for (const [f, d] of chords) tone(f, t0 + d, 0.7, "triangle", 0.3)
  crowd(t0, 3.2)
}

export function isMuted() {
  return muted
}

export function toggleMute() {
  muted = !muted
  try {
    localStorage.setItem("nk-mute", muted ? "1" : "0")
  } catch (_e) {
    /* storage недоступен */
  }
  if (master) master.gain.value = muted ? 0 : 0.6
  if (muted) {
    stopLoop()
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
  } else if (wantMusic) startLoop()
  return muted
}
