import * as THREE from 'three'
import { Sizes } from './Utils/Sizes.js'
import { Time } from './Utils/Time.js'
import { Camera } from './Camera.js'
import { Renderer } from './Renderer.js'
import { Physics } from './Physics.js'
import { Controls } from './Controls.js'
import { GameState } from './GameState.js'
import { Audio } from './Audio.js'
import { Vehicle } from './Vehicles/Vehicle.js'
import { VEHICLES } from './Vehicles/VehicleData.js'
import { HubWorld } from './World/HubWorld.js'
import { RaceWorld } from './World/RaceWorld.js'
import { RockCrawlWorld } from './World/RockCrawlWorld.js'
import { GarageUI } from './Modes/GarageUI.js'

/**
 * Root class — owns scene, camera, renderer, physics, time loop.
 * Orchestrates mode switching, options menu, off-map respawn, geography.
 */
export class Experience {
  constructor(canvas) {
    this.canvas = canvas
    this.scene = new THREE.Scene()
    this.sizes = new Sizes()
    this.gameState = new GameState()
    this.physics = new Physics()
    this.camera = new Camera(this)
    this.renderer = new Renderer(this)
    this.controls = new Controls()
    this.audio = new Audio()
    this.time = new Time()

    this.vehicle = null
    this.world = null
    this.garageUI = new GarageUI(this.gameState)
    this.paused = false

    // Options state
    // Sound and creatures OFF by default — enable via ESC menu
    this.soundEnabled = false
    this.creaturesEnabled = false

    // Random city on each load
    const cities = ['dubai', 'miami', 'tokyo', 'tuscany', 'vancouver']
    this.geography = cities[Math.floor(Math.random() * cities.length)]

    // Off-map respawn state
    this._offmapTimer = 0
    this._offmapActive = false
    this._lastOnMapPos = new THREE.Vector3(0, 2, 0)
    this._MAP_BOUNDS = 95 // half-size of 200x200 ground

    // DOM elements
    this.fade = document.getElementById('fade')
    this.portalPrompt = document.getElementById('portal-prompt')
    this._offmapEl = document.getElementById('offmap-timer')
    this._offmapCountEl = document.getElementById('offmap-count')
    this._optionsMenu = document.getElementById('options-menu')

    // Event bindings
    this.sizes.on('resize', () => this._onResize())
    this.time.on('tick', () => this._onTick())
    this.controls.on('cycleCamera', () => this.camera.cycleMode())
    this.controls.on('toggleGarage', () => this._toggleGarage())
    this.controls.on('horn', () => this.audio.honk())
    this.controls.on('reset', () => { if (this.vehicle) this.vehicle.flipUpright() })
    this.controls.on('enter', () => this._enterPortal())
    this.controls.on('escape', () => this._handleEscape())

    // Audio init on first interaction
    this.canvas.addEventListener('click', () => this.audio.init(), { once: true })
    window.addEventListener('keydown', () => this.audio.init(), { once: true })

    // Wire up options menu
    this._setupOptionsMenu()

    // Start in hub
    this._switchMode('hub')

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading').classList.add('hidden')
    }, 500)
  }

  // ── Options Menu ──

  _setupOptionsMenu() {
    // Sound toggle — starts OFF
    const soundBtn = document.getElementById('opt-sound')
    soundBtn.textContent = 'OFF'
    soundBtn.classList.remove('active')
    soundBtn.addEventListener('click', () => {
      this.soundEnabled = !this.soundEnabled
      soundBtn.textContent = this.soundEnabled ? 'ON' : 'OFF'
      soundBtn.classList.toggle('active', this.soundEnabled)
      if (this.soundEnabled) this.audio.init()
      if (!this.soundEnabled && this.audio.ctx) {
        this.audio.engineGain.gain.setTargetAtTime(0, this.audio.ctx.currentTime, 0.01)
        this.audio.boostGain.gain.setTargetAtTime(0, this.audio.ctx.currentTime, 0.01)
        this.audio.screechGain.gain.setTargetAtTime(0, this.audio.ctx.currentTime, 0.01)
      }
    })

    // Creatures toggle — starts OFF
    const creaturesBtn = document.getElementById('opt-creatures')
    creaturesBtn.textContent = 'OFF'
    creaturesBtn.classList.remove('active')
    creaturesBtn.addEventListener('click', () => {
      this.creaturesEnabled = !this.creaturesEnabled
      creaturesBtn.textContent = this.creaturesEnabled ? 'ON' : 'OFF'
      creaturesBtn.classList.toggle('active', this.creaturesEnabled)
      if (this.world && this.world.creatures) {
        this.world.creatures.setDisabled(!this.creaturesEnabled)
      }
    })

    // Geography buttons — highlight current random city
    const geoButtons = document.querySelectorAll('.geo-btn')
    geoButtons.forEach(btn => {
      if (btn.dataset.geo === this.geography) btn.classList.add('selected')
      btn.addEventListener('click', () => {
        geoButtons.forEach(b => b.classList.remove('selected'))
        btn.classList.add('selected')
        this.geography = btn.dataset.geo
      })
    })

    // Resume
    document.getElementById('opt-resume').addEventListener('click', () => {
      this._closeOptions()
    })

    // Restart
    document.getElementById('opt-restart').addEventListener('click', () => {
      this._closeOptions()
      this._switchMode('hub')
    })
  }

  _handleEscape() {
    if (this.paused) {
      this._closeOptions()
    } else if (this.gameState.mode === 'garage') {
      this._switchMode('hub')
    } else {
      this._openOptions()
    }
  }

  _openOptions() {
    this.paused = true
    this._optionsMenu.style.display = 'block'
  }

  _closeOptions() {
    this.paused = false
    this._optionsMenu.style.display = 'none'
    // Apply geography change if needed
    if (this.world instanceof HubWorld && this.world.geography !== this.geography) {
      this._switchMode('hub')
    }
  }

  // ── Mode switching ──

  async _switchMode(mode) {
    this.fade.classList.add('active')
    await this._wait(500)

    if (this.world) { this.world.dispose(); this.world = null }
    if (this.vehicle) { this.vehicle.dispose(); this.vehicle = null }
    this.physics.clear()

    this.garageUI.hide()
    this.portalPrompt.classList.remove('visible')
    this._offmapEl.style.display = 'none'
    this._offmapActive = false
    this._offmapTimer = 0
    document.getElementById('hud').style.display = 'block'

    this.gameState.setMode(mode)

    if (mode === 'hub') {
      this.world = new HubWorld(this, this.geography)
      if (!this.creaturesEnabled && this.world.creatures) {
        this.world.creatures.setDisabled(true)
      }
      this._spawnVehicle(0, 2, 0)
      this._updateHUDMode('HUB')
    }
    else if (mode === 'garage') {
      document.getElementById('hud').style.display = 'none'
      this.garageUI.show(
        () => this._switchMode('hub'),
        () => this._switchMode('hub')
      )
    }
    else if (mode === 'race') {
      const vDef = VEHICLES.find(v => v.id === this.gameState.selectedVehicleId)
      if (vDef && vDef.class !== 'racing') {
        this.portalPrompt.textContent = 'Racing vehicles only! Visit the garage to swap.'
        this.portalPrompt.classList.add('visible')
        setTimeout(() => this.portalPrompt.classList.remove('visible'), 2000)
        this.world = new HubWorld(this, this.geography)
        this._spawnVehicle(0, 2, 0)
        this._updateHUDMode('HUB')
        this.gameState.setMode('hub')
        this.fade.classList.remove('active')
        return
      }
      this.world = new RaceWorld(this)
      const sp = this.world.getStartPosition()
      this._spawnVehicle(sp.x, sp.y, sp.z)
      this._updateHUDMode('RACE')
    }
    else if (mode === 'rockcrawl') {
      const vDef = VEHICLES.find(v => v.id === this.gameState.selectedVehicleId)
      if (vDef && vDef.class !== 'offroad') {
        this.portalPrompt.textContent = 'Off-road vehicles only! Visit the garage to swap.'
        this.portalPrompt.classList.add('visible')
        setTimeout(() => this.portalPrompt.classList.remove('visible'), 2000)
        this.world = new HubWorld(this, this.geography)
        this._spawnVehicle(0, 2, 0)
        this._updateHUDMode('HUB')
        this.gameState.setMode('hub')
        this.fade.classList.remove('active')
        return
      }
      this.world = new RockCrawlWorld(this)
      const sp = this.world.getStartPosition()
      this._spawnVehicle(sp.x, sp.y, sp.z)
      this._updateHUDMode('ROCK CRAWL')
    }

    await this._wait(100)
    this.fade.classList.remove('active')
  }

  _spawnVehicle(x, y, z) {
    const vDef = VEHICLES.find(v => v.id === this.gameState.selectedVehicleId)
    if (!vDef) return
    this.vehicle = new Vehicle(this.physics, this.scene, vDef, this.gameState.selectedColorIndex)
    this.vehicle.resetPosition(x, y, z)
    this._lastOnMapPos.set(x, y, z)
    document.getElementById('hud-vehicle').textContent = vDef.name
  }

  _toggleGarage() {
    if (this.paused) return
    if (this.gameState.mode === 'hub') this._switchMode('garage')
    else if (this.gameState.mode === 'garage') this._switchMode('hub')
  }

  _enterPortal() {
    if (this.paused) return
    if (this.gameState.mode !== 'hub' || !this.world || !this.vehicle) return
    const pos = new THREE.Vector3().copy(this.vehicle.chassisBody.position)
    const mode = this.world.checkPortals(pos)
    if (mode) this._switchMode(mode)
  }

  _nearPortal = null

  // ── Off-map respawn ──

  _checkOffMap(pos, dt) {
    const oob = Math.abs(pos.x) > this._MAP_BOUNDS || Math.abs(pos.z) > this._MAP_BOUNDS || pos.y < -5

    if (oob) {
      if (!this._offmapActive) {
        this._offmapActive = true
        this._offmapTimer = 3
        this._offmapEl.style.display = 'block'
      }
      this._offmapTimer -= dt
      this._offmapCountEl.textContent = Math.max(1, Math.ceil(this._offmapTimer))

      if (this._offmapTimer <= 0) {
        // Respawn facing center
        const rx = this._lastOnMapPos.x
        const rz = this._lastOnMapPos.z
        // Clamp respawn position inside bounds
        const sx = Math.max(-80, Math.min(80, rx))
        const sz = Math.max(-80, Math.min(80, rz))
        this.vehicle.resetPosition(sx, 2.5, sz)
        // Face toward center
        const angleToCenter = Math.atan2(-sx, -sz)
        this.vehicle.chassisBody.quaternion.setFromEuler(0, angleToCenter, 0)

        this._offmapActive = false
        this._offmapEl.style.display = 'none'
      }
    } else {
      if (this._offmapActive) {
        this._offmapActive = false
        this._offmapEl.style.display = 'none'
      }
      // Remember last valid position
      this._lastOnMapPos.copy(pos)
    }
  }

  // ── Tick ──

  _onTick() {
    if (this.paused) {
      // Still render so the background stays visible behind the menu
      this.renderer.update()
      return
    }

    const delta = this.time.delta
    const dt = delta / 1000

    this.controls.update()

    if (this.vehicle) {
      if (this.gameState.mode !== 'garage') {
        this.vehicle.applyControls(this.controls, delta)
      }
      this.vehicle.update()

      const pos = new THREE.Vector3().copy(this.vehicle.chassisBody.position)
      const quat = new THREE.Quaternion().copy(this.vehicle.chassisBody.quaternion)
      this.camera.update(pos, quat, this.vehicle.speed / 3.6, delta)

      // Dinosaur stomp screen shake
      if (this.world instanceof HubWorld && this.creaturesEnabled && this.world.creatures) {
        const shake = this.world.creatures.getScreenShake(pos)
        if (shake > 0.05) {
          this.camera.instance.position.x += (Math.random() - 0.5) * shake * 0.5
          this.camera.instance.position.y += (Math.random() - 0.5) * shake * 0.3
        }
      }

      // Speedometer
      const speed = this.vehicle.speed
      document.getElementById('hud-speed').textContent = Math.floor(speed)

      // Gear indicator (simulated: N, 1-6 based on speed)
      let gear = 'N', rpmPct = 0, rpmColor = '#0f0'
      if (speed < 2) { gear = 'N'; rpmPct = 0 }
      else if (speed < 30) { gear = '1'; rpmPct = speed / 30 * 100 }
      else if (speed < 60) { gear = '2'; rpmPct = (speed - 30) / 30 * 100 }
      else if (speed < 100) { gear = '3'; rpmPct = (speed - 60) / 40 * 100 }
      else if (speed < 160) { gear = '4'; rpmPct = (speed - 100) / 60 * 100 }
      else if (speed < 230) { gear = '5'; rpmPct = (speed - 160) / 70 * 100 }
      else { gear = '6'; rpmPct = Math.min(100, (speed - 230) / 80 * 100) }
      if (this.vehicle.chassisBody.velocity.length() < 0.5 && Math.abs(this.controls.throttle) < 0.1) { gear = 'N'; rpmPct = 0 }
      if (rpmPct > 80) rpmColor = '#ff4400'
      else if (rpmPct > 50) rpmColor = '#ffcc00'
      else rpmColor = '#00cc44'
      document.getElementById('hud-gear').textContent = gear
      const rpmEl = document.getElementById('hud-rpm')
      rpmEl.style.width = rpmPct + '%'
      rpmEl.style.background = rpmColor

      document.getElementById('hud-boost').style.width = this.vehicle.boostMeter + '%'

      // Apply powerup effects to vehicle
      if (this.world instanceof HubWorld) {
        const pState = this.world.getPowerupState()
        const bonuses = this.world.getPowerupBonuses()
        // Superboost active — extra multiplier applied in Vehicle.applyControls via flag
        this.vehicle._superboost = pState.superboost || false
        this.vehicle._bonuses = bonuses
        // Shield — scatter creatures
        if (pState.shield && this.creaturesEnabled && this.world.creatures) {
          for (const c of this.world.creatures.creatures) {
            const dx = c.x - pos.x, dz = c.z - pos.z
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < 30) {
              c.state = 'wander'
              c.x += (dx / (dist || 1)) * 5 * dt
              c.z += (dz / (dist || 1)) * 5 * dt
            }
          }
        }
        // Timewarp — slow creatures
        if (pState.timewarp && this.world.creatures) {
          this.world.creatures._timewarpActive = true
        } else if (this.world.creatures) {
          this.world.creatures._timewarpActive = false
        }
      }

      // Audio
      if (this.soundEnabled) {
        const slipping = Math.abs(this.vehicle.chassisBody.angularVelocity.y) > 2 && this.vehicle.speed > 20
        this.audio.update(this.vehicle.speed / 3.6, this.vehicle.boostActive, slipping)
      }

      // Off-map check
      this._checkOffMap(pos, dt)
    }

    this.physics.update(delta)

    // World update
    if (this.world) {
      if (this.world.update) {
        if (this.world instanceof HubWorld) {
          const vPos = this.vehicle ? new THREE.Vector3().copy(this.vehicle.chassisBody.position) : null
          this.world.update(this.time.elapsed, delta, vPos)

          if (this.vehicle) {
            const pos = vPos
            const nearMode = this.world.checkPortals(pos)
            if (nearMode && nearMode !== this._nearPortal) {
              this.portalPrompt.textContent = `Press ENTER to enter ${nearMode.toUpperCase()}`
              this.portalPrompt.style.color = '#ffd700'
              this.portalPrompt.classList.add('visible')
            } else if (!nearMode) {
              const cw = this.creaturesEnabled ? this.world.getCreatureWarning(pos) : null
              if (cw) {
                const label = cw.type.charAt(0).toUpperCase() + cw.type.slice(1)
                if (cw.chasing) {
                  this.portalPrompt.textContent = `${label} is chasing you!`
                  this.portalPrompt.style.color = '#ff4444'
                } else {
                  this.portalPrompt.textContent = `${label} nearby...`
                  this.portalPrompt.style.color = '#ffd700'
                }
                this.portalPrompt.classList.add('visible')
              } else {
                this.portalPrompt.classList.remove('visible')
                this.portalPrompt.style.color = '#ffd700'
              }
            }
            this._nearPortal = nearMode
          }
        }
        else if (this.world instanceof RaceWorld) {
          const pos = this.vehicle ? new THREE.Vector3().copy(this.vehicle.chassisBody.position) : null
          this.world.update(delta, pos)
        }
        else if (this.world instanceof RockCrawlWorld) {
          const pos = this.vehicle ? new THREE.Vector3().copy(this.vehicle.chassisBody.position) : null
          const up = this.vehicle ? new THREE.Vector3(0, 1, 0).applyQuaternion(
            new THREE.Quaternion().copy(this.vehicle.chassisBody.quaternion)
          ) : null
          this.world.update(delta, pos, up)
          if (this.world.flipped && this.vehicle) {
            this.vehicle.flipUpright()
            this.world.flipTimer = 0
          }
        }
      }
    }

    this.renderer.update()
  }

  _onResize() {
    this.camera.resize()
    this.renderer.resize()
  }

  _updateHUDMode(text) {
    document.getElementById('hud-mode').textContent = text
  }

  _wait(ms) {
    return new Promise(r => setTimeout(r, ms))
  }
}
