import { EventEmitter } from './Utils/EventEmitter.js'

/**
 * Keyboard + Xbox/Gamepad input handler.
 * Merges keyboard and gamepad state each frame.
 */
export class Controls extends EventEmitter {
  constructor() {
    super()
    this.keys = {}
    this.throttle = 0
    this.steering = 0
    this.brake = false
    this.boost = false

    // Gamepad state
    this._gamepad = null
    this._gpPrevButtons = {}

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true
      if (e.code === 'KeyC') this.emit('cycleCamera')
      if (e.code === 'KeyG') this.emit('toggleGarage')
      if (e.code === 'KeyH') this.emit('horn')
      if (e.code === 'KeyR') this.emit('reset')
      if (e.code === 'Enter') this.emit('enter')
      if (e.code === 'Escape') this.emit('escape')
    })

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false
    })

    // Gamepad connection
    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id)
      this._gamepad = e.gamepad
    })
    window.addEventListener('gamepaddisconnected', () => {
      console.log('Gamepad disconnected')
      this._gamepad = null
    })
  }

  /**
   * Called each frame to compute derived input state from keyboard + gamepad.
   */
  update() {
    // ── Keyboard input ──
    const kbFwd = this.keys['ArrowUp'] || this.keys['KeyW'] ? 1 : 0
    const kbRev = this.keys['ArrowDown'] || this.keys['KeyS'] ? 1 : 0
    let throttle = kbFwd - kbRev

    const kbLeft = this.keys['ArrowLeft'] || this.keys['KeyA'] ? 1 : 0
    const kbRight = this.keys['ArrowRight'] || this.keys['KeyD'] ? 1 : 0
    let steering = kbRight - kbLeft

    // Space = BOOST (infinite, always available), Shift = brake
    let boost = !!this.keys['Space']
    let brake = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight']

    // ── Gamepad input (merge — gamepad overrides if active) ──
    const gp = this._getGamepad()
    if (gp) {
      // Left stick X = steering (axis 0)
      const stickX = this._deadzone(gp.axes[0], 0.15)
      if (Math.abs(stickX) > 0) steering = stickX

      // Right trigger (axis 3 on many controllers, or button 7) = throttle
      // Left trigger (axis 2 or button 6) = reverse/brake
      const rt = gp.buttons[7] ? gp.buttons[7].value : 0  // right trigger
      const lt = gp.buttons[6] ? gp.buttons[6].value : 0  // left trigger

      if (rt > 0.05 || lt > 0.05) {
        throttle = rt - lt
      }

      // A button (0) = boost
      if (gp.buttons[0] && gp.buttons[0].pressed) boost = true

      // X button (2) = brake/handbrake
      if (gp.buttons[2] && gp.buttons[2].pressed) brake = true

      // B button (1) = horn (one-shot)
      if (gp.buttons[1] && gp.buttons[1].pressed && !this._gpPrevButtons[1]) {
        this.emit('horn')
      }

      // Y button (3) = reset (one-shot)
      if (gp.buttons[3] && gp.buttons[3].pressed && !this._gpPrevButtons[3]) {
        this.emit('reset')
      }

      // Right bumper (5) = cycle camera (one-shot)
      if (gp.buttons[5] && gp.buttons[5].pressed && !this._gpPrevButtons[5]) {
        this.emit('cycleCamera')
      }

      // Left bumper (4) = toggle garage (one-shot)
      if (gp.buttons[4] && gp.buttons[4].pressed && !this._gpPrevButtons[4]) {
        this.emit('toggleGarage')
      }

      // Start button (9) = escape/menu (one-shot)
      if (gp.buttons[9] && gp.buttons[9].pressed && !this._gpPrevButtons[9]) {
        this.emit('escape')
      }

      // Back/Select button (8) = enter portal (one-shot)
      if (gp.buttons[8] && gp.buttons[8].pressed && !this._gpPrevButtons[8]) {
        this.emit('enter')
      }

      // Save button states for one-shot detection
      for (let i = 0; i < gp.buttons.length; i++) {
        this._gpPrevButtons[i] = gp.buttons[i].pressed
      }
    }

    this.throttle = throttle
    this.steering = steering
    this.brake = brake
    this.boost = boost
  }

  _getGamepad() {
    // Gamepads must be re-polled each frame
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : []
    for (const gp of gamepads) {
      if (gp && gp.connected) return gp
    }
    return null
  }

  _deadzone(value, threshold) {
    if (Math.abs(value) < threshold) return 0
    return value
  }
}
