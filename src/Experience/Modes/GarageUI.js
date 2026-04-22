import { VEHICLES } from '../Vehicles/VehicleData.js'

/**
 * DOM-based garage UI with canvas-rendered car previews.
 * Each car is drawn to visually match its real-world description.
 */
export class GarageUI {
  constructor(gameState) {
    this.gameState = gameState
    this.container = document.getElementById('garage-ui')
    this.list = document.getElementById('garage-list')
    this.driveBtn = document.getElementById('garage-drive')
    this.backBtn = document.getElementById('garage-back')

    this.selectedId = gameState.selectedVehicleId
    this.selectedColor = gameState.selectedColorIndex

    this._onDrive = null
    this._onBack = null

    this.driveBtn.addEventListener('click', () => {
      this.gameState.setVehicle(this.selectedId, this.selectedColor)
      if (this._onDrive) this._onDrive()
    })

    this.backBtn.addEventListener('click', () => {
      if (this._onBack) this._onBack()
    })
  }

  show(onDrive, onBack) {
    this._onDrive = onDrive
    this._onBack = onBack
    this.selectedId = this.gameState.selectedVehicleId
    this.selectedColor = this.gameState.selectedColorIndex
    this._render()
    this.container.style.display = 'block'
  }

  hide() {
    this.container.style.display = 'none'
  }

  _render() {
    this.list.innerHTML = ''
    for (const v of VEHICLES) {
      const card = document.createElement('div')
      card.className = 'car-card' + (v.id === this.selectedId ? ' selected' : '')

      // Canvas car preview
      const previewCanvas = document.createElement('canvas')
      previewCanvas.width = 260
      previewCanvas.height = 120
      previewCanvas.style.width = '100%'
      previewCanvas.style.borderRadius = '4px'
      previewCanvas.style.marginBottom = '8px'
      const colorIdx = v.id === this.selectedId ? this.selectedColor : 0
      this._drawCarPreview(previewCanvas, v, colorIdx)

      const classTag = `<span class="class-tag ${v.class}">${v.class.toUpperCase()}</span>`

      // Stat bars
      const speedPct = Math.round((v.topSpeedKmh / 350) * 100)
      const accelPct = Math.round((1 - (v.zeroToSixty - 2) / 7) * 100)
      const powerPct = Math.round((v.engineForce / 1000) * 100)

      card.innerHTML = `
        <h3>${v.name}</h3>
        ${classTag}
        <div class="stat-row"><span>Speed</span><div class="stat-bar"><div class="stat-fill" style="width:${speedPct}%;background:#00ccff"></div></div><span class="stat-val">${v.topSpeedKmh}</span></div>
        <div class="stat-row"><span>Accel</span><div class="stat-bar"><div class="stat-fill" style="width:${accelPct}%;background:#ff6600"></div></div><span class="stat-val">${v.zeroToSixty}s</span></div>
        <div class="stat-row"><span>Power</span><div class="stat-bar"><div class="stat-fill" style="width:${powerPct}%;background:#44cc44"></div></div><span class="stat-val">${v.torque}</span></div>
        <div class="car-blurb">${v.blurb}</div>
        <div class="colors" id="colors-${v.id}"></div>
      `

      // Insert canvas before the text
      card.insertBefore(previewCanvas, card.firstChild)

      card.addEventListener('click', () => {
        this.selectedId = v.id
        this._render()
      })

      this.list.appendChild(card)

      // Color dots
      const colorsDiv = card.querySelector(`#colors-${v.id}`)
      v.colors.forEach((color, i) => {
        const dot = document.createElement('div')
        dot.className = 'color-dot' + (v.id === this.selectedId && i === this.selectedColor ? ' active' : '')
        dot.style.background = '#' + color.toString(16).padStart(6, '0')
        dot.addEventListener('click', (e) => {
          e.stopPropagation()
          this.selectedId = v.id
          this.selectedColor = i
          this._render()
        })
        colorsDiv.appendChild(dot)
      })
    }
  }

  /**
   * Draw a side-profile preview of each car on a canvas.
   * Each vehicle type gets a unique silhouette matching its description.
   */
  _drawCarPreview(canvas, v, colorIdx) {
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const color = '#' + v.colors[colorIdx].toString(16).padStart(6, '0')

    // Background — showroom floor
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#1a1a2e')
    grad.addColorStop(0.7, '#16213e')
    grad.addColorStop(1, '#222')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Floor reflection line
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, H - 18)
    ctx.lineTo(W, H - 18)
    ctx.stroke()

    // Center the car
    ctx.save()
    ctx.translate(W / 2, H / 2 + 10)

    // Dispatch to car-specific drawer
    switch (v.id) {
      case 'wrx_sti': this._drawWRX(ctx, color); break
      case 'rock_crawler': this._drawCrawler(ctx, color); break
      case 'trophy_truck': this._drawTrophyTruck(ctx, color); break
      case 'lifted_4x4': this._drawLifted4x4(ctx, color); break
      case 'dune_buggy': this._drawBuggy(ctx, color); break
      case 'formula': this._drawFormula(ctx, color); break
      case 'gt_coupe': this._drawGTCoupe(ctx, color); break
      case 'rally_car': this._drawRallyCar(ctx, color); break
      case 'hypercar': this._drawHypercar(ctx, color); break
      default: this._drawGeneric(ctx, color); break
    }

    ctx.restore()

    // Name plate glow
    ctx.fillStyle = 'rgba(255,215,0,0.06)'
    ctx.fillRect(0, 0, W, 4)
  }

  // ── Car Drawers (side profile, centered at 0,0) ──

  _wheels(ctx, x1, x2, y, r, rimColor) {
    // Tires
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.arc(x1, y, r, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x2, y, r, 0, Math.PI * 2); ctx.fill()
    // Rims
    ctx.fillStyle = rimColor || '#aaa'
    ctx.beginPath(); ctx.arc(x1, y, r * 0.55, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x2, y, r * 0.55, 0, Math.PI * 2); ctx.fill()
    // Hub
    ctx.fillStyle = '#555'
    ctx.beginPath(); ctx.arc(x1, y, r * 0.2, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(x2, y, r * 0.2, 0, Math.PI * 2); ctx.fill()
  }

  _headlights(ctx, x, y) {
    ctx.fillStyle = '#ffffcc'
    ctx.shadowColor = '#ffffaa'
    ctx.shadowBlur = 8
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }

  _taillights(ctx, x, y) {
    ctx.fillStyle = '#ff2222'
    ctx.shadowColor = '#ff0000'
    ctx.shadowBlur = 6
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }

  _drawWRX(ctx, color) {
    // Subaru WRX STI — rally sedan, hood scoop, big wing, gold wheels
    const bw = 100, bh = 20
    // Lower body
    ctx.fillStyle = color
    this._roundRect(ctx, -bw/2, -5, bw, bh, 4)
    // Cabin
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-30, -5)
    ctx.lineTo(-22, -25)
    ctx.lineTo(20, -25)
    ctx.lineTo(30, -5)
    ctx.fill()
    // Windows
    ctx.fillStyle = '#5588bb'
    ctx.beginPath()
    ctx.moveTo(-28, -5)
    ctx.lineTo(-21, -23)
    ctx.lineTo(-2, -23)
    ctx.lineTo(-2, -5)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(2, -5)
    ctx.lineTo(2, -23)
    ctx.lineTo(18, -23)
    ctx.lineTo(28, -5)
    ctx.fill()
    // Hood scoop
    ctx.fillStyle = '#111'
    this._roundRect(ctx, -42, -10, 14, 5, 2)
    // STI wing
    ctx.fillStyle = color
    ctx.fillRect(25, -30, 22, 3)
    ctx.fillStyle = '#333'
    ctx.fillRect(28, -27, 2, 7)
    ctx.fillRect(43, -27, 2, 7)
    // Wheels — gold BBS
    this._wheels(ctx, -32, 32, 15, 12, '#daa520')
    this._headlights(ctx, -48, 2)
    this._taillights(ctx, 48, 2)
    // STI badge
    ctx.fillStyle = '#ff1744'
    ctx.font = 'bold 7px sans-serif'
    ctx.fillText('STI', 36, 8)
  }

  _drawCrawler(ctx, color) {
    // Rock Crawler — tall, boxy, massive tires, lifted
    ctx.fillStyle = color
    this._roundRect(ctx, -45, -15, 90, 25, 3)
    // Cabin
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-25, -15)
    ctx.lineTo(-18, -35)
    ctx.lineTo(15, -35)
    ctx.lineTo(22, -15)
    ctx.fill()
    ctx.fillStyle = '#5588bb'
    ctx.beginPath()
    ctx.moveTo(-23, -15)
    ctx.lineTo(-16, -33)
    ctx.lineTo(13, -33)
    ctx.lineTo(20, -15)
    ctx.fill()
    // Roll cage bars
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-18, -33); ctx.lineTo(-18, -15)
    ctx.moveTo(13, -33); ctx.lineTo(13, -15)
    ctx.stroke()
    // Roof rack
    ctx.fillStyle = '#555'
    ctx.fillRect(-20, -38, 36, 3)
    // Light bar
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = '#ffff88'
      ctx.fillRect(-14 + i * 9, -41, 5, 3)
    }
    // Huge tires
    this._wheels(ctx, -30, 30, 15, 16, '#888')
    this._headlights(ctx, -44, -2)
    this._taillights(ctx, 44, -2)
  }

  _drawTrophyTruck(ctx, color) {
    // Trophy Truck — long, aero, wide stance
    ctx.fillStyle = color
    this._roundRect(ctx, -55, -8, 110, 22, 4)
    // Cab — set back
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-10, -8)
    ctx.lineTo(-4, -28)
    ctx.lineTo(20, -28)
    ctx.lineTo(26, -8)
    ctx.fill()
    ctx.fillStyle = '#5588bb'
    ctx.beginPath()
    ctx.moveTo(-8, -8); ctx.lineTo(-2, -26); ctx.lineTo(18, -26); ctx.lineTo(24, -8)
    ctx.fill()
    // Number plate
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('77', -35, 6)
    // Suspension visible — long travel shocks
    ctx.strokeStyle = '#ff6600'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-38, 8); ctx.lineTo(-38, 18)
    ctx.moveTo(38, 8); ctx.lineTo(38, 18)
    ctx.stroke()
    this._wheels(ctx, -38, 38, 18, 14, '#aaa')
    this._headlights(ctx, -53, 0)
    this._taillights(ctx, 53, 0)
  }

  _drawLifted4x4(ctx, color) {
    // Lifted 4x4 — boxy SUV, lift kit
    ctx.fillStyle = color
    this._roundRect(ctx, -42, -12, 84, 24, 3)
    // Cabin — boxy, tall
    ctx.fillStyle = color
    ctx.fillRect(-24, -32, 48, 20)
    ctx.fillStyle = '#5588bb'
    ctx.fillRect(-22, -30, 18, 16)
    ctx.fillRect(4, -30, 18, 16)
    // Bull bar
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-42, -10); ctx.lineTo(-46, 0); ctx.lineTo(-42, 8)
    ctx.stroke()
    // Spare tire on back
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath(); ctx.arc(44, -10, 9, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#888'
    ctx.beginPath(); ctx.arc(44, -10, 5, 0, Math.PI * 2); ctx.fill()
    this._wheels(ctx, -28, 28, 16, 13, '#999')
    this._headlights(ctx, -42, -2)
    this._taillights(ctx, 42, 0)
  }

  _drawBuggy(ctx, color) {
    // Dune Buggy — open frame, exposed engine, roll cage
    // Tubular frame
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-40, 5); ctx.lineTo(-35, -15); ctx.lineTo(30, -15); ctx.lineTo(40, 5)
    ctx.stroke()
    // Roll cage
    ctx.strokeStyle = '#999'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-15, -15); ctx.lineTo(-10, -30); ctx.lineTo(15, -30); ctx.lineTo(20, -15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-10, -30); ctx.lineTo(15, -30)
    ctx.stroke()
    // Seats
    ctx.fillStyle = '#222'
    ctx.fillRect(-8, -14, 8, 12)
    ctx.fillRect(4, -14, 8, 12)
    // Engine exposed at rear
    ctx.fillStyle = '#555'
    ctx.fillRect(25, -10, 12, 12)
    ctx.fillStyle = '#ff4400'
    ctx.fillRect(27, -12, 3, 3) // air filter
    // Floor pan
    ctx.fillStyle = color
    ctx.fillRect(-38, 3, 76, 4)
    this._wheels(ctx, -32, 32, 12, 11, '#bbb')
    this._headlights(ctx, -38, -2)
    this._taillights(ctx, 38, -2)
  }

  _drawFormula(ctx, color) {
    // Formula — open wheel, front/rear wing, nose cone
    // Nose cone
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-60, 0)
    ctx.lineTo(-40, -6)
    ctx.lineTo(-40, 6)
    ctx.fill()
    // Body
    ctx.fillStyle = color
    this._roundRect(ctx, -40, -7, 75, 14, 3)
    // Cockpit opening
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.ellipse(-5, -2, 8, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Helmet
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-5, -5, 4, 0, Math.PI * 2)
    ctx.fill()
    // Intake/airbox
    ctx.fillStyle = color
    ctx.fillRect(-8, -14, 6, 7)
    // Front wing
    ctx.fillStyle = '#333'
    ctx.fillRect(-62, 5, 20, 2)
    ctx.fillRect(-62, -7, 20, 2)
    // Rear wing
    ctx.fillStyle = '#333'
    ctx.fillRect(30, -16, 18, 3)
    ctx.fillRect(33, -13, 2, 8)
    ctx.fillRect(44, -13, 2, 8)
    // Exposed wheels
    this._wheels(ctx, -42, 30, 10, 10, '#bbb')
    // Side pods
    ctx.fillStyle = color
    ctx.fillRect(-20, -10, 30, 3)
    ctx.fillRect(-20, 7, 30, 3)
  }

  _drawGTCoupe(ctx, color) {
    // GT Coupe — sleek, long hood, fastback
    ctx.fillStyle = color
    this._roundRect(ctx, -50, -5, 100, 20, 5)
    // Long hood
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-50, -5)
    ctx.quadraticCurveTo(-52, -3, -50, 0)
    ctx.fill()
    // Cabin — fastback
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-10, -5)
    ctx.lineTo(-4, -22)
    ctx.lineTo(22, -22)
    ctx.lineTo(35, -5)
    ctx.fill()
    // Windows
    ctx.fillStyle = '#4477aa'
    ctx.beginPath()
    ctx.moveTo(-8, -5); ctx.lineTo(-2, -20); ctx.lineTo(20, -20); ctx.lineTo(33, -5)
    ctx.fill()
    // B-pillar
    ctx.fillStyle = color
    ctx.fillRect(6, -20, 2, 16)
    // Trunk lip spoiler
    ctx.fillStyle = '#333'
    ctx.fillRect(40, -7, 10, 2)
    this._wheels(ctx, -32, 32, 15, 11, '#ccc')
    this._headlights(ctx, -48, 2)
    this._taillights(ctx, 48, 2)
  }

  _drawRallyCar(ctx, color) {
    // Rally Car — WRC style, mud flaps, roof scoop, spot lights
    ctx.fillStyle = color
    this._roundRect(ctx, -48, -5, 96, 20, 3)
    // Cabin
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-22, -5)
    ctx.lineTo(-16, -24)
    ctx.lineTo(18, -24)
    ctx.lineTo(24, -5)
    ctx.fill()
    ctx.fillStyle = '#5588bb'
    ctx.beginPath()
    ctx.moveTo(-20, -5); ctx.lineTo(-14, -22); ctx.lineTo(16, -22); ctx.lineTo(22, -5)
    ctx.fill()
    // Rally number
    ctx.fillStyle = '#fff'
    ctx.fillRect(-44, -2, 16, 12)
    ctx.fillStyle = '#000'
    ctx.font = 'bold 10px sans-serif'
    ctx.fillText('05', -42, 8)
    // Roof scoop
    ctx.fillStyle = '#222'
    ctx.fillRect(-4, -27, 10, 4)
    // Spot lights
    ctx.fillStyle = '#ffffaa'
    ctx.shadowColor = '#ffffaa'
    ctx.shadowBlur = 5
    ctx.beginPath(); ctx.arc(-46, -4, 4, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(-40, -7, 3, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    // Mud flaps
    ctx.fillStyle = '#222'
    ctx.fillRect(-38, 12, 5, 6)
    ctx.fillRect(33, 12, 5, 6)
    // Rear wing
    ctx.fillStyle = color
    ctx.fillRect(28, -28, 16, 3)
    ctx.fillRect(30, -25, 2, 6)
    ctx.fillRect(42, -25, 2, 6)
    this._wheels(ctx, -32, 32, 16, 12, '#ddd')
    this._taillights(ctx, 46, 2)
  }

  _drawHypercar(ctx, color) {
    // Hypercar — ultra-low, aggressive, massive diffuser, exotic
    // Very low body
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-55, 3)
    ctx.quadraticCurveTo(-50, -8, -30, -8)
    ctx.lineTo(35, -8)
    ctx.quadraticCurveTo(50, -8, 48, 3)
    ctx.lineTo(48, 10)
    ctx.lineTo(-55, 10)
    ctx.fill()
    // Cabin — very low, teardrop
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(-8, -8)
    ctx.quadraticCurveTo(0, -22, 15, -20)
    ctx.lineTo(28, -8)
    ctx.fill()
    // Windshield
    ctx.fillStyle = '#334455'
    ctx.beginPath()
    ctx.moveTo(-6, -8)
    ctx.quadraticCurveTo(2, -20, 14, -18)
    ctx.lineTo(26, -8)
    ctx.fill()
    // Side intake/scoops
    ctx.fillStyle = '#111'
    ctx.fillRect(-28, -4, 15, 5)
    ctx.fillRect(20, -4, 15, 5)
    // Rear diffuser
    ctx.fillStyle = '#222'
    ctx.fillRect(38, 2, 10, 8)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#111'
      ctx.fillRect(39 + i * 3, 3, 1, 6)
    }
    // Active wing
    ctx.fillStyle = '#222'
    ctx.fillRect(35, -14, 14, 2)
    ctx.fillRect(37, -12, 2, 5)
    ctx.fillRect(47, -12, 2, 5)
    // Exhaust (central, high-mount)
    ctx.fillStyle = '#888'
    ctx.beginPath(); ctx.arc(48, 0, 3, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#ff6600'
    ctx.beginPath(); ctx.arc(48, 0, 1.5, 0, Math.PI * 2); ctx.fill()
    this._wheels(ctx, -35, 32, 12, 10, '#bbb')
    this._headlights(ctx, -52, 0)
    this._taillights(ctx, 46, 2)
  }

  _drawGeneric(ctx, color) {
    ctx.fillStyle = color
    this._roundRect(ctx, -45, -5, 90, 20, 4)
    ctx.fillStyle = '#5588bb'
    ctx.fillRect(-15, -20, 30, 16)
    this._wheels(ctx, -30, 30, 15, 10, '#aaa')
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
  }
}
