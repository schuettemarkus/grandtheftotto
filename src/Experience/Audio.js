/**
 * WebAudio-based sound system.
 * Engine pitch tracks RPM, tire screech on slip, boost whoosh.
 */
export class Audio {
  constructor() {
    this.ctx = null
    this.started = false
    this.engineOsc = null
    this.engineGain = null
    this.boostOsc = null
    this.boostGain = null
  }

  init() {
    if (this.started) return
    this.started = true
    this.ctx = new (window.AudioContext || window.webkitAudioContext)()

    // Engine — sawtooth
    this.engineOsc = this.ctx.createOscillator()
    this.engineGain = this.ctx.createGain()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 55
    this.engineGain.gain.value = 0
    this.engineOsc.connect(this.engineGain)
    this.engineGain.connect(this.ctx.destination)
    this.engineOsc.start()

    // Boost whoosh — filtered noise
    this.boostOsc = this.ctx.createOscillator()
    this.boostGain = this.ctx.createGain()
    this.boostOsc.type = 'sine'
    this.boostOsc.frequency.value = 300
    this.boostGain.gain.value = 0
    this.boostOsc.connect(this.boostGain)
    this.boostGain.connect(this.ctx.destination)
    this.boostOsc.start()

    // Tire screech — noise through bandpass
    const bufSize = this.ctx.sampleRate
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    this.screechSrc = this.ctx.createBufferSource()
    this.screechSrc.buffer = buf
    this.screechSrc.loop = true
    this.screechGain = this.ctx.createGain()
    this.screechGain.gain.value = 0
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2500
    filter.Q.value = 3
    this.screechSrc.connect(filter)
    filter.connect(this.screechGain)
    this.screechGain.connect(this.ctx.destination)
    this.screechSrc.start()
  }

  update(speed, boosting, slipping) {
    if (!this.ctx) return
    const t = this.ctx.currentTime

    // Engine
    const rpm = 55 + Math.abs(speed) * 8
    this.engineOsc.frequency.setTargetAtTime(Math.min(rpm, 400), t, 0.05)
    this.engineGain.gain.setTargetAtTime(Math.min(0.06, Math.abs(speed) * 0.008), t, 0.05)

    // Boost
    this.boostOsc.frequency.setTargetAtTime(boosting ? 400 + Math.abs(speed) * 10 : 300, t, 0.05)
    this.boostGain.gain.setTargetAtTime(boosting ? 0.04 : 0, t, 0.08)

    // Screech
    this.screechGain.gain.setTargetAtTime(slipping ? 0.06 : 0, t, 0.05)
  }

  /** Play a one-shot honk */
  honk() {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 220
    gain.gain.value = 0.08
    gain.gain.setTargetAtTime(0, this.ctx.currentTime + 0.15, 0.05)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.3)
  }
}
