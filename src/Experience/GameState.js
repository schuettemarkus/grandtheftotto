import { EventEmitter } from './Utils/EventEmitter.js'

/**
 * Tracks current game mode, selected vehicle, unlocks, and best times.
 */
export class GameState extends EventEmitter {
  constructor() {
    super()
    this.mode = 'hub' // 'hub' | 'garage' | 'rockcrawl' | 'race'
    this.selectedVehicleId = 'wrx_sti'
    this.selectedColorIndex = 0
    this.bestLapTime = Infinity
    this.bestCrawlTier = 0

    // Load from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem('gto_state') || '{}')
      if (saved.vehicleId) this.selectedVehicleId = saved.vehicleId
      if (saved.colorIndex !== undefined) this.selectedColorIndex = saved.colorIndex
      if (saved.bestLap) this.bestLapTime = saved.bestLap
      if (saved.crawlTier) this.bestCrawlTier = saved.crawlTier
    } catch (e) { /* ignore */ }
  }

  setMode(mode) {
    const prev = this.mode
    this.mode = mode
    this.emit('modeChange', mode, prev)
  }

  setVehicle(id, colorIndex) {
    this.selectedVehicleId = id
    this.selectedColorIndex = colorIndex ?? 0
    this._save()
  }

  recordLap(time) {
    if (time < this.bestLapTime) {
      this.bestLapTime = time
      this._save()
    }
  }

  _save() {
    try {
      localStorage.setItem('gto_state', JSON.stringify({
        vehicleId: this.selectedVehicleId,
        colorIndex: this.selectedColorIndex,
        bestLap: this.bestLapTime,
        crawlTier: this.bestCrawlTier,
      }))
    } catch (e) { /* ignore */ }
  }
}
