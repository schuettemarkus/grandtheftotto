import { EventEmitter } from './EventEmitter.js'

export class Time extends EventEmitter {
  constructor() {
    super()
    this.start = Date.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 16 // ms per frame
    this._raf = null
    this._tick()
  }

  _tick() {
    const now = Date.now()
    this.delta = Math.min(now - this.current, 50) // cap to avoid spiral
    this.current = now
    this.elapsed = this.current - this.start
    this.emit('tick')
    this._raf = window.requestAnimationFrame(() => this._tick())
  }

  dispose() {
    window.cancelAnimationFrame(this._raf)
  }
}
