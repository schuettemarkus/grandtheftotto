import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * Race track with banked turns, chicane, elevation, guardrails, and AI opponents.
 */
export class RaceWorld {
  constructor(experience) {
    this.experience = experience
    this.scene = experience.scene
    this.physics = experience.physics
    this.objects = []

    // Race state
    this.lap = 0
    this.maxLaps = 3
    this.lapTime = 0
    this.bestLap = Infinity
    this.totalTime = 0
    this.position = 1
    this.finished = false
    this.countdown = 3
    this.countdownTimer = 0

    // Track waypoints for AI and lap detection
    this.waypoints = []
    this.playerWaypoint = 0

    // AI opponents
    this.opponents = []

    this._buildTrack()
    this._buildLights()
    this._buildAI()
    this._setupHUD()
  }

  _buildTrack() {
    // Ground
    const groundGeo = new THREE.PlaneGeometry(300, 300)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a6b3a, roughness: 0.9 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.physics.groundMaterial,
    })
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physics.world.addBody(groundBody)
    this.objects.push({ mesh: ground, body: groundBody })

    // Build track from waypoints — oval with chicane
    const trackPoints = []
    const numPoints = 40
    for (let i = 0; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI * 2
      let x = Math.cos(t) * 50
      let z = Math.sin(t) * 30

      // Chicane at one end
      if (i >= 18 && i <= 22) {
        x += Math.sin((i - 18) * Math.PI / 4) * 8
      }

      // Elevation change
      let y = 0
      if (i >= 8 && i <= 14) y = Math.sin((i - 8) * Math.PI / 6) * 3

      trackPoints.push(new THREE.Vector3(x, y, z))
      this.waypoints.push(new THREE.Vector3(x, y, z))
    }

    // Track surface — extruded path
    const trackWidth = 12
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 })

    for (let i = 0; i < trackPoints.length; i++) {
      const curr = trackPoints[i]
      const next = trackPoints[(i + 1) % trackPoints.length]
      const dir = new THREE.Vector3().subVectors(next, curr)
      const len = dir.length()
      dir.normalize()

      const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()

      // Track segment
      const segGeo = new THREE.PlaneGeometry(trackWidth, len)
      const seg = new THREE.Mesh(segGeo, trackMat)
      const mid = new THREE.Vector3().addVectors(curr, next).multiplyScalar(0.5)
      seg.position.copy(mid)
      seg.position.y += 0.05
      seg.rotation.x = -Math.PI / 2
      seg.rotation.z = -Math.atan2(dir.z, dir.x) + Math.PI / 2
      seg.receiveShadow = true
      this.scene.add(seg)
      this.objects.push({ mesh: seg })

      // Guardrails (physics walls on each side)
      for (const side of [-1, 1]) {
        const wallPos = new THREE.Vector3().copy(mid).add(right.clone().multiplyScalar(side * trackWidth / 2))
        const wallBody = new CANNON.Body({
          type: CANNON.Body.STATIC,
          shape: new CANNON.Box(new CANNON.Vec3(0.2, 1, len / 2)),
          material: this.physics.groundMaterial,
        })
        wallBody.position.set(wallPos.x, 0.5, wallPos.z)
        const angle = Math.atan2(dir.x, dir.z)
        wallBody.quaternion.setFromEuler(0, angle, 0)
        this.physics.world.addBody(wallBody)
        this.objects.push({ body: wallBody })

        // Visual guardrail
        const railGeo = new THREE.BoxGeometry(0.3, 0.8, len)
        const railMat = new THREE.MeshStandardMaterial({ color: 0xcccccc })
        const rail = new THREE.Mesh(railGeo, railMat)
        rail.position.copy(wallPos)
        rail.position.y = 0.4
        rail.rotation.y = angle
        rail.castShadow = true
        this.scene.add(rail)
        this.objects.push({ mesh: rail })
      }
    }

    // Start/finish line
    const lineGeo = new THREE.PlaneGeometry(trackWidth, 1)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const line = new THREE.Mesh(lineGeo, lineMat)
    line.position.copy(trackPoints[0])
    line.position.y = 0.06
    line.rotation.x = -Math.PI / 2
    this.scene.add(line)
    this.objects.push({ mesh: line })

    // Sky
    this.scene.fog = new THREE.Fog(0x88bbee, 80, 250)
  }

  _buildLights() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(this.ambient)
    this.sun = new THREE.DirectionalLight(0xffffff, 1.0)
    this.sun.position.set(40, 60, 30)
    this.sun.castShadow = true
    this.sun.shadow.camera.left = -60
    this.sun.shadow.camera.right = 60
    this.sun.shadow.camera.top = 60
    this.sun.shadow.camera.bottom = -60
    this.sun.shadow.camera.far = 150
    this.sun.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sun)
  }

  _buildAI() {
    // 4 AI opponents as colored boxes
    const colors = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71]
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.BoxGeometry(1.6, 0.8, 2.2)
      const mat = new THREE.MeshStandardMaterial({ color: colors[i] })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      const startPos = this.waypoints[0].clone()
      startPos.x += (i + 1) * 3
      startPos.y += 0.5
      mesh.position.copy(startPos)
      this.scene.add(mesh)

      this.opponents.push({
        mesh,
        waypoint: 0,
        lap: 0,
        speed: 12 + Math.random() * 4,
        position: startPos.clone(),
        angle: 0,
      })
      this.objects.push({ mesh })
    }
  }

  _setupHUD() {
    this.raceHud = document.getElementById('race-hud')
    this.raceHud.style.display = 'block'
  }

  getStartPosition() {
    const wp = this.waypoints[0]
    return { x: wp.x, y: wp.y + 2, z: wp.z + 5 }
  }

  update(delta, vehiclePos) {
    const dt = delta / 1000
    this.totalTime += dt

    // Countdown
    if (this.countdown > 0) {
      this.countdownTimer += dt
      if (this.countdownTimer >= 1) {
        this.countdown--
        this.countdownTimer = 0
      }
      this._updateHUD()
      return
    }

    this.lapTime += dt

    // Player waypoint tracking
    if (this.waypoints.length > 0 && vehiclePos) {
      const nextWP = this.waypoints[(this.playerWaypoint + 1) % this.waypoints.length]
      if (vehiclePos.distanceTo(nextWP) < 15) {
        this.playerWaypoint = (this.playerWaypoint + 1) % this.waypoints.length
        // Lap detection
        if (this.playerWaypoint === 0 && this.lapTime > 5) {
          if (this.lapTime < this.bestLap) this.bestLap = this.lapTime
          this.experience.gameState.recordLap(this.lapTime)
          this.lapTime = 0
          this.lap++
          if (this.lap >= this.maxLaps) this.finished = true
        }
      }
    }

    // AI opponents
    for (const opp of this.opponents) {
      const target = this.waypoints[(opp.waypoint + 1) % this.waypoints.length]
      const dx = target.x - opp.position.x
      const dz = target.z - opp.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)

      // Steer toward target
      opp.angle = Math.atan2(dx, dz)
      opp.position.x += Math.sin(opp.angle) * opp.speed * dt
      opp.position.z += Math.cos(opp.angle) * opp.speed * dt
      opp.position.y = target.y + 0.5

      opp.mesh.position.copy(opp.position)
      opp.mesh.rotation.y = opp.angle

      if (dist < 10) {
        opp.waypoint = (opp.waypoint + 1) % this.waypoints.length
        if (opp.waypoint === 0) opp.lap++
      }
    }

    // Calculate position
    const playerProgress = this.lap * this.waypoints.length + this.playerWaypoint
    let pos = 1
    for (const opp of this.opponents) {
      const oppProgress = opp.lap * this.waypoints.length + opp.waypoint
      if (oppProgress > playerProgress) pos++
    }
    this.position = pos

    this._updateHUD()
  }

  _updateHUD() {
    const posEl = document.getElementById('race-pos')
    const lapEl = document.getElementById('race-lap')
    const timeEl = document.getElementById('race-time')

    if (this.countdown > 0) {
      posEl.textContent = this.countdown
      posEl.style.fontSize = '3rem'
      lapEl.textContent = ''
      timeEl.textContent = 'GET READY'
    } else if (this.finished) {
      posEl.textContent = this.position + getOrd(this.position) + '!'
      lapEl.textContent = 'FINISHED'
      timeEl.textContent = 'Total: ' + this.totalTime.toFixed(1) + 's'
    } else {
      posEl.textContent = this.position + getOrd(this.position)
      posEl.style.fontSize = '1.8rem'
      lapEl.textContent = `Lap ${Math.min(this.lap + 1, this.maxLaps)}/${this.maxLaps}`
      const m = Math.floor(this.lapTime / 60)
      const s = (this.lapTime % 60).toFixed(1)
      timeEl.textContent = `${m}:${s.padStart(4, '0')}`
    }
  }

  dispose() {
    this.raceHud.style.display = 'none'
    for (const obj of this.objects) {
      if (obj.mesh) this.scene.remove(obj.mesh)
      if (obj.body) this.physics.world.removeBody(obj.body)
    }
    if (this.ambient) this.scene.remove(this.ambient)
    if (this.sun) this.scene.remove(this.sun)
    this.scene.fog = null
    this.objects = []
  }
}

function getOrd(n) { return n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th' }
