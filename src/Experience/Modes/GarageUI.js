import { VEHICLES } from '../Vehicles/VehicleData.js'

/**
 * DOM-based garage UI. Renders car cards with stats and paint picker.
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

      const classTag = `<span class="class-tag ${v.class}">${v.class.toUpperCase()}</span>`
      card.innerHTML = `
        <h3>${v.name}</h3>
        ${classTag}
        <div class="stat">Top Speed: ${v.topSpeedKmh} km/h</div>
        <div class="stat">0-60: ${v.zeroToSixty}s</div>
        <div class="stat">Torque: ${v.torque}</div>
        <div class="stat" style="font-style:italic;color:#777;margin-top:4px">${v.blurb}</div>
        <div class="colors" id="colors-${v.id}"></div>
      `

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
}
