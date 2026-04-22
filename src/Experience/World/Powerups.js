import * as THREE from 'three'

/**
 * Powerup types:
 *  - coin:       Gold coin, collect for points. Milestones at 10, 25, 50, 100.
 *  - superboost: Blue lightning bolt — 5 seconds of 4x boost power.
 *  - shield:     Green sphere — 8 seconds of invulnerability (creatures scatter).
 *  - magnet:     Purple — attracts nearby coins for 6 seconds.
 *  - timewarp:   Orange — slows everything except player for 5 seconds.
 */

const POWERUP_DEFS = {
  coin:       { color: 0xffd700, emissive: 0xffa500, icon: '\u{1FA99}', label: 'Coin',       desc: '+1 Coin collected!', radius: 0.4, count: 40 },
  superboost: { color: 0x00ccff, emissive: 0x0088ff, icon: '\u26A1',    label: 'SUPER BOOST', desc: '4x boost power for 5 seconds!', radius: 0.5, count: 5 },
  shield:     { color: 0x44ff44, emissive: 0x00cc00, icon: '\u{1F6E1}', label: 'SHIELD',      desc: 'Invulnerable for 8 seconds! Creatures scatter.', radius: 0.5, count: 4 },
  magnet:     { color: 0xcc44ff, emissive: 0x8800cc, icon: '\u{1F9F2}', label: 'COIN MAGNET', desc: 'Attracts nearby coins for 6 seconds!', radius: 0.5, count: 4 },
  timewarp:   { color: 0xff8800, emissive: 0xff4400, icon: '\u23F1',    label: 'TIME WARP',   desc: 'Everything slows down for 5 seconds!', radius: 0.5, count: 3 },
}

const COIN_MILESTONES = [
  { at: 10,  title: '10 COINS!',  sub: 'Speed boost permanently increased!', effect: 'speedUp' },
  { at: 25,  title: '25 COINS!',  sub: 'Handling upgraded!', effect: 'handlingUp' },
  { at: 50,  title: '50 COINS!',  sub: 'MEGA BOOST unlocked — double boost power!', effect: 'megaBoost' },
  { at: 100, title: '100 COINS!', sub: 'LEGENDARY STATUS! Max everything!', effect: 'legendary' },
]

export class Powerups {
  constructor(scene) {
    this.scene = scene
    this.items = []
    this.coins = 0
    this.activePowerups = {} // type -> { remaining: seconds }
    this._milestonesTriggered = new Set()

    this._toastEl = document.getElementById('powerup-toast')
    this._milestoneEl = document.getElementById('milestone-banner')
    this._coinEl = document.getElementById('hud-coins')
    this._toastTimer = 0
    this._milestoneTimer = 0

    this._spawn()
  }

  _spawn() {
    for (const [type, def] of Object.entries(POWERUP_DEFS)) {
      for (let i = 0; i < def.count; i++) {
        const x = (Math.random() - 0.5) * 170
        const z = (Math.random() - 0.5) * 170
        if (Math.abs(x) < 6 && Math.abs(z) < 6) continue // avoid spawn area

        const group = new THREE.Group()
        group.position.set(x, type === 'coin' ? 0.8 : 1.2, z)

        if (type === 'coin') {
          // Flat cylinder coin
          const coinGeo = new THREE.CylinderGeometry(def.radius, def.radius, 0.08, 16)
          const coinMat = new THREE.MeshStandardMaterial({
            color: def.color, emissive: def.emissive, emissiveIntensity: 0.5,
            metalness: 0.9, roughness: 0.2,
          })
          const coin = new THREE.Mesh(coinGeo, coinMat)
          coin.rotation.z = Math.PI / 2 // stand upright
          group.add(coin)
        } else {
          // Glowing sphere for powerups
          const geo = new THREE.SphereGeometry(def.radius, 12, 12)
          const mat = new THREE.MeshStandardMaterial({
            color: def.color, emissive: def.emissive, emissiveIntensity: 1.0,
            transparent: true, opacity: 0.8,
          })
          const sphere = new THREE.Mesh(geo, mat)
          group.add(sphere)

          // Inner glow core
          const coreGeo = new THREE.SphereGeometry(def.radius * 0.4, 8, 8)
          const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, emissive: def.emissive, emissiveIntensity: 2,
          })
          group.add(new THREE.Mesh(coreGeo, coreMat))
        }

        // Point light for glow
        const light = new THREE.PointLight(def.color, 0.5, 5)
        light.position.y = 0.5
        group.add(light)

        this.scene.add(group)
        this.items.push({
          type, group, x, z,
          collected: false,
          bobPhase: Math.random() * Math.PI * 2,
          def,
        })
      }
    }
  }

  /**
   * Update each frame. Check collection, animate, tick active powerups.
   * Returns active powerup effects for the vehicle.
   */
  update(delta, playerPos) {
    const dt = delta / 1000

    // Tick active powerups
    for (const [type, state] of Object.entries(this.activePowerups)) {
      state.remaining -= dt
      if (state.remaining <= 0) delete this.activePowerups[type]
    }

    // Toast timer
    if (this._toastTimer > 0) {
      this._toastTimer -= dt
      if (this._toastTimer <= 0) this._toastEl.classList.remove('visible')
    }
    if (this._milestoneTimer > 0) {
      this._milestoneTimer -= dt
      if (this._milestoneTimer <= 0) this._milestoneEl.classList.remove('visible')
    }

    // Magnet radius
    const magnetActive = !!this.activePowerups.magnet
    const magnetRange = 25

    for (const item of this.items) {
      if (item.collected) continue

      // Animate: bob and rotate
      item.bobPhase += dt * 3
      item.group.position.y = (item.type === 'coin' ? 0.8 : 1.2) + Math.sin(item.bobPhase) * 0.2
      item.group.rotation.y += dt * 2

      if (!playerPos) continue

      let dx = playerPos.x - item.x
      let dz = playerPos.z - item.z
      let dist = Math.sqrt(dx * dx + dz * dz)

      // Magnet attraction for coins
      if (magnetActive && item.type === 'coin' && dist < magnetRange) {
        const pull = 15 * dt
        item.x += (dx / dist) * pull
        item.z += (dz / dist) * pull
        item.group.position.x = item.x
        item.group.position.z = item.z
        // Recalculate distance
        dx = playerPos.x - item.x
        dz = playerPos.z - item.z
        dist = Math.sqrt(dx * dx + dz * dz)
      }

      // Collection check
      const pickupRange = item.type === 'coin' ? 2.5 : 3
      if (dist < pickupRange) {
        item.collected = true
        item.group.visible = false

        if (item.type === 'coin') {
          this.coins++
          this._coinEl.textContent = this.coins
          this._showToast(item.def.icon, '+1 Coin', '#ffd700')
          this._checkMilestones()
        } else {
          const duration = item.type === 'superboost' ? 5 : item.type === 'shield' ? 8 : item.type === 'magnet' ? 6 : 5
          this.activePowerups[item.type] = { remaining: duration }
          this._showToast(item.def.icon, `${item.def.label}: ${item.def.desc}`, item.def.color)
        }
      }
    }

    return {
      superboost: !!this.activePowerups.superboost,
      shield: !!this.activePowerups.shield,
      magnet: !!this.activePowerups.magnet,
      timewarp: !!this.activePowerups.timewarp,
      coins: this.coins,
    }
  }

  _showToast(icon, text, color) {
    const hex = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color
    this._toastEl.innerHTML = `<span class="icon">${icon}</span> <span style="color:${hex}">${text}</span>`
    this._toastEl.classList.add('visible')
    this._toastTimer = 2.5
  }

  _checkMilestones() {
    for (const m of COIN_MILESTONES) {
      if (this.coins >= m.at && !this._milestonesTriggered.has(m.at)) {
        this._milestonesTriggered.add(m.at)
        this._milestoneEl.querySelector('.title').textContent = m.title
        this._milestoneEl.querySelector('.sub').textContent = m.sub
        this._milestoneEl.classList.add('visible')
        this._milestoneTimer = 4
      }
    }
  }

  /**
   * Get permanent bonuses from coin milestones.
   */
  getBonuses() {
    return {
      speedMultiplier: this.coins >= 100 ? 1.5 : this.coins >= 10 ? 1.15 : 1,
      handlingMultiplier: this.coins >= 100 ? 1.5 : this.coins >= 25 ? 1.2 : 1,
      boostMultiplier: this.coins >= 100 ? 3 : this.coins >= 50 ? 2 : 1,
    }
  }

  dispose() {
    for (const item of this.items) {
      this.scene.remove(item.group)
    }
    this.items = []
    this._toastEl.classList.remove('visible')
    this._milestoneEl.classList.remove('visible')
  }
}
