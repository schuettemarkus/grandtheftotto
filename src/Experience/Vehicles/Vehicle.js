import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * Builds a RaycastVehicle from a vehicle data definition.
 * Creates both the Three.js visuals and Cannon-es physics.
 *
 * Physics stability notes:
 * - Chassis shape is offset upward so the center of mass sits low
 * - High angular damping prevents tippy behavior
 * - Wheels connect well below the chassis center
 */
export class Vehicle {
  constructor(physics, scene, vehicleDef, colorIndex = 0) {
    this.physics = physics
    this.scene = scene
    this.def = vehicleDef
    this.colorIndex = colorIndex

    this.speed = 0
    this.boostMeter = 100
    this.boostActive = false

    this._buildPhysics()
    this._buildVisuals()
  }

  _buildPhysics() {
    const def = this.def
    const { x, y, z } = def.chassisSize

    // Chassis rigid body — shape offset slightly upward to lower center of mass
    const chassisShape = new CANNON.Box(new CANNON.Vec3(x, y * 0.6, z * 0.5))
    this.chassisBody = new CANNON.Body({ mass: def.mass })
    // Small upward offset keeps center of mass low for stability
    this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, 0.15, 0))
    this.chassisBody.position.set(0, 1, 0)
    this.chassisBody.angularDamping = 0.8  // very high — prevents any tipping
    this.chassisBody.linearDamping = 0.05

    // RaycastVehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    })

    const w = def.wheels
    const wheelOptions = {
      radius: w.radius,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      suspensionStiffness: w.suspension.stiffness,
      dampingRelaxation: w.suspension.damping,
      dampingCompression: w.suspension.damping * 0.8,
      maxSuspensionTravel: w.suspension.travel,
      maxSuspensionForce: 100000,
      frictionSlip: w.frictionSlip,
      customSlidingRotationalSpeed: -30,
      useCustomSlidingRotationalSpeed: true,
      suspensionRestLength: w.suspension.restLength,
    }

    // FL, FR, RL, RR — wheel connection points relative to body center
    const positions = [
      new CANNON.Vec3(-w.front.x, w.front.y, -w.front.z),
      new CANNON.Vec3( w.front.x, w.front.y, -w.front.z),
      new CANNON.Vec3(-w.rear.x,  w.rear.y,   w.rear.z),
      new CANNON.Vec3( w.rear.x,  w.rear.y,   w.rear.z),
    ]

    for (const pos of positions) {
      this.vehicle.addWheel({ ...wheelOptions, chassisConnectionPointLocal: pos })
    }

    this.vehicle.addToWorld(this.physics.world)

    // Kinematic wheel bodies (for visual sync, not physics)
    this.wheelBodies = []
    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      const wheel = this.vehicle.wheelInfos[i]
      const shape = new CANNON.Cylinder(wheel.radius, wheel.radius, w.width, 12)
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC })
      body.addShape(shape, new CANNON.Vec3(), new CANNON.Quaternion().setFromEuler(0, 0, Math.PI / 2))
      this.physics.world.addBody(body)
      this.wheelBodies.push(body)
    }
  }

  _buildVisuals() {
    const def = this.def
    const color = def.colors[this.colorIndex]

    this.group = new THREE.Group()
    this.scene.add(this.group)

    // Dispatch to specific builder if available
    if (def.id === 'wrx_sti') {
      this._buildWRXSTI(color)
    } else {
      this._buildGenericCar(color)
    }

    this._buildWheelMeshes()
  }

  /**
   * Subaru WRX STI — detailed low-poly model
   * Rally Blue body, gold BBS wheels, hood scoop, rear wing, quad exhausts
   */
  _buildWRXSTI(color) {
    const def = this.def
    const { x, y, z } = def.chassisSize
    const bodyColor = color
    const matOpts = { roughness: 0.25, metalness: 0.7 }

    // ── Lower body (main shell) ──
    const lowerGeo = new THREE.BoxGeometry(x * 2.1, y * 0.7, z * 1.05)
    const lowerMat = new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts })
    const lower = new THREE.Mesh(lowerGeo, lowerMat)
    lower.position.set(0, 0.15, 0)
    lower.castShadow = true
    this.group.add(lower)

    // Front bumper — slightly protruding
    const bumperGeo = new THREE.BoxGeometry(x * 2.15, y * 0.35, 0.2)
    const bumperMat = new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts })
    const frontBumper = new THREE.Mesh(bumperGeo, bumperMat)
    frontBumper.position.set(0, -0.05, -z * 0.55)
    this.group.add(frontBumper)

    // Front lower grille (black)
    const grilleGeo = new THREE.BoxGeometry(x * 1.6, y * 0.25, 0.06)
    const grilleMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 })
    const grille = new THREE.Mesh(grilleGeo, grilleMat)
    grille.position.set(0, -0.1, -z * 0.53)
    this.group.add(grille)

    // Rear bumper
    const rearBumper = new THREE.Mesh(bumperGeo, bumperMat)
    rearBumper.position.set(0, -0.05, z * 0.55)
    this.group.add(rearBumper)

    // ── Cabin / greenhouse ──
    const cabinGeo = new THREE.BoxGeometry(x * 1.7, y * 0.7, z * 0.55)
    const cabinMat = new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts })
    const cabin = new THREE.Mesh(cabinGeo, cabinMat)
    cabin.position.set(0, y * 0.7 + 0.15, z * 0.02)
    cabin.castShadow = true
    this.group.add(cabin)

    // ── Windshield (front) — angled glass ──
    const wsGeo = new THREE.BoxGeometry(x * 1.6, y * 0.6, 0.04)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, roughness: 0.05, metalness: 0.9,
      transparent: true, opacity: 0.45,
    })
    const windshield = new THREE.Mesh(wsGeo, glassMat)
    windshield.position.set(0, y * 0.65 + 0.15, -z * 0.23)
    windshield.rotation.x = -0.3
    this.group.add(windshield)

    // Rear window
    const rearWin = new THREE.Mesh(wsGeo.clone(), glassMat)
    rearWin.position.set(0, y * 0.65 + 0.15, z * 0.29)
    rearWin.rotation.x = 0.3
    this.group.add(rearWin)

    // Side windows
    for (const side of [-1, 1]) {
      const sideGeo = new THREE.BoxGeometry(0.04, y * 0.45, z * 0.42)
      const sideWin = new THREE.Mesh(sideGeo, glassMat)
      sideWin.position.set(side * x * 0.86, y * 0.7 + 0.15, z * 0.02)
      this.group.add(sideWin)
    }

    // ── HOOD SCOOP (signature WRX STI feature) ──
    const scoopGeo = new THREE.BoxGeometry(x * 0.5, y * 0.2, z * 0.2)
    const scoopMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 })
    const scoop = new THREE.Mesh(scoopGeo, scoopMat)
    scoop.position.set(0, y * 0.55, -z * 0.2)
    this.group.add(scoop)
    // Scoop opening
    const scoopOpenGeo = new THREE.BoxGeometry(x * 0.4, y * 0.08, z * 0.12)
    const scoopOpen = new THREE.Mesh(scoopOpenGeo, new THREE.MeshStandardMaterial({ color: 0x050505 }))
    scoopOpen.position.set(0, y * 0.65, -z * 0.22)
    this.group.add(scoopOpen)

    // ── REAR WING (big STI wing) ──
    const wingGeo = new THREE.BoxGeometry(x * 2.1, 0.06, 0.35)
    const wingMat = new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts })
    const wing = new THREE.Mesh(wingGeo, wingMat)
    wing.position.set(0, y * 1.35 + 0.15, z * 0.42)
    wing.castShadow = true
    this.group.add(wing)
    // Wing end plates
    for (const side of [-1, 1]) {
      const plateGeo = new THREE.BoxGeometry(0.04, y * 0.35, 0.4)
      const plate = new THREE.Mesh(plateGeo, wingMat)
      plate.position.set(side * x * 1.0, y * 1.2 + 0.15, z * 0.42)
      this.group.add(plate)
    }
    // Wing pedestals
    for (const side of [-1, 1]) {
      const pedGeo = new THREE.BoxGeometry(0.06, y * 0.5, 0.06)
      const ped = new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 }))
      ped.position.set(side * x * 0.65, y * 1.05 + 0.15, z * 0.44)
      this.group.add(ped)
    }

    // ── Headlights (hawk-eye style) ──
    const hlGeo = new THREE.BoxGeometry(x * 0.35, y * 0.2, 0.08)
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 2, transparent: true, opacity: 0.9 })
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(hlGeo, hlMat)
      hl.position.set(side * x * 0.72, 0.15, -z * 0.52)
      this.group.add(hl)
      // DRL strip
      const drlGeo = new THREE.BoxGeometry(x * 0.3, 0.03, 0.04)
      const drlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 })
      const drl = new THREE.Mesh(drlGeo, drlMat)
      drl.position.set(side * x * 0.72, 0.06, -z * 0.53)
      this.group.add(drl)
    }

    // ── Taillights (C-shape STI style) ──
    const tlGeo = new THREE.BoxGeometry(x * 0.3, y * 0.2, 0.06)
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 })
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(tlGeo, tlMat)
      tl.position.set(side * x * 0.72, 0.15, z * 0.53)
      this.group.add(tl)
    }
    // Reverse lights
    const revGeo = new THREE.BoxGeometry(x * 0.15, y * 0.08, 0.04)
    const revMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 })
    for (const side of [-1, 1]) {
      const rev = new THREE.Mesh(revGeo, revMat)
      rev.position.set(side * x * 0.5, 0.02, z * 0.54)
      this.group.add(rev)
    }

    // ── Side mirrors ──
    for (const side of [-1, 1]) {
      const mirrorGeo = new THREE.BoxGeometry(0.1, 0.08, 0.12)
      const mirror = new THREE.Mesh(mirrorGeo, new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts }))
      mirror.position.set(side * (x * 1.05 + 0.05), y * 0.55 + 0.15, -z * 0.12)
      this.group.add(mirror)
    }

    // ── Door lines ──
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })
    for (const side of [-1, 1]) {
      const lineGeo = new THREE.BoxGeometry(0.01, y * 0.6, 0.01)
      const line = new THREE.Mesh(lineGeo, lineMat)
      line.position.set(side * x * 1.05, y * 0.35 + 0.15, z * 0.0)
      this.group.add(line)
    }

    // ── Quad exhaust tips ──
    const exhMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.3, metalness: 0.9 })
    const tipPositions = [[-0.25, -0.12], [-0.1, -0.12], [0.1, -0.12], [0.25, -0.12]]
    for (const [tx, ty] of tipPositions) {
      const tipGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8)
      tipGeo.rotateX(Math.PI / 2)
      const tip = new THREE.Mesh(tipGeo, exhMat)
      tip.position.set(tx, ty, z * 0.56)
      this.group.add(tip)
    }

    // ── Fender flares (wider arches) ──
    for (const side of [-1, 1]) {
      for (const fz of [-z * 0.32, z * 0.32]) {
        const flareGeo = new THREE.BoxGeometry(0.08, y * 0.3, z * 0.22)
        const flare = new THREE.Mesh(flareGeo, new THREE.MeshStandardMaterial({ color: bodyColor, ...matOpts }))
        flare.position.set(side * (x * 1.05 + 0.02), 0.05, fz)
        this.group.add(flare)
      }
    }

    // ── STI badge (red accent on rear) ──
    const badgeGeo = new THREE.BoxGeometry(x * 0.3, y * 0.08, 0.02)
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 0.3 })
    const badge = new THREE.Mesh(badgeGeo, badgeMat)
    badge.position.set(0, 0.3, z * 0.555)
    this.group.add(badge)
  }

  /**
   * Generic car model used for all non-WRX vehicles.
   */
  _buildGenericCar(color) {
    const def = this.def
    const { x, y, z } = def.chassisSize

    // Main body
    const bodyGeo = new THREE.BoxGeometry(x * 2, y * 1.2, z)
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.6 })
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat)
    this.bodyMesh.castShadow = true
    this.bodyMesh.position.y = 0.15
    this.group.add(this.bodyMesh)

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(x * 1.6, y * 0.8, z * 0.55)
    const cabinMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 })
    const cabin = new THREE.Mesh(cabinGeo, cabinMat)
    cabin.position.y = y * 0.9 + 0.15
    cabin.position.z = z * 0.05
    cabin.castShadow = true
    this.group.add(cabin)

    // Windshield
    const wsGeo = new THREE.BoxGeometry(x * 1.5, y * 0.65, 0.05)
    const wsMat = new THREE.MeshStandardMaterial({
      color: 0x88bbdd, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.5,
    })
    const ws = new THREE.Mesh(wsGeo, wsMat)
    ws.position.set(0, y * 0.85 + 0.15, -z * 0.22)
    ws.rotation.x = -0.25
    this.group.add(ws)

    // Rear window
    const rw = new THREE.Mesh(wsGeo, wsMat)
    rw.position.set(0, y * 0.85 + 0.15, z * 0.32)
    rw.rotation.x = 0.25
    this.group.add(rw)

    // Headlights
    const hlGeo = new THREE.SphereGeometry(0.1, 8, 8)
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffcc, emissiveIntensity: 2 })
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(hlGeo, hlMat)
      hl.position.set(side * x * 0.7, 0.15, -z * 0.5)
      this.group.add(hl)
    }

    // Taillights
    const tlMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1.5 })
    for (const side of [-1, 1]) {
      const tl = new THREE.Mesh(hlGeo, tlMat)
      tl.position.set(side * x * 0.7, 0.15, z * 0.5)
      this.group.add(tl)
    }

    // Off-road extras
    if (def.class === 'offroad') {
      const rackGeo = new THREE.BoxGeometry(x * 1.7, 0.05, z * 0.5)
      const rack = new THREE.Mesh(rackGeo, new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 }))
      rack.position.y = y * 1.35 + 0.15
      rack.position.z = z * 0.05
      this.group.add(rack)
      const lbMat = new THREE.MeshStandardMaterial({ color: 0xffff88, emissive: 0xffff44, emissiveIntensity: 1 })
      for (let i = -2; i <= 2; i++) {
        const lb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), lbMat)
        lb.position.set(i * 0.25, y * 1.4 + 0.15, z * 0.05 - z * 0.2)
        this.group.add(lb)
      }
    }

    // Racing wing
    if (def.class === 'racing' && def.id !== 'rally_car') {
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 })
      const wing = new THREE.Mesh(new THREE.BoxGeometry(x * 2, 0.05, 0.3), wingMat)
      wing.position.set(0, y * 1.2 + 0.15, z * 0.45)
      this.group.add(wing)
      for (const side of [-1, 1]) {
        const sup = new THREE.Mesh(new THREE.BoxGeometry(0.05, y * 0.5, 0.05), wingMat)
        sup.position.set(side * x * 0.7, y * 0.95 + 0.15, z * 0.45)
        this.group.add(sup)
      }
    }
  }

  _buildWheelMeshes() {
    this.wheelMeshes = []
    const w = this.def.wheels
    const isSTI = this.def.id === 'wrx_sti'

    const wheelGeo = new THREE.CylinderGeometry(w.radius, w.radius, w.width, 16)
    wheelGeo.rotateZ(Math.PI / 2)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })

    // STI gets gold BBS rims
    const rimColor = isSTI ? 0xdaa520 : 0x999999
    const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, roughness: 0.2, metalness: 0.8 })

    for (let i = 0; i < 4; i++) {
      const wheelGroup = new THREE.Group()
      const tire = new THREE.Mesh(wheelGeo, wheelMat)
      tire.castShadow = true
      wheelGroup.add(tire)

      const rimGeo = new THREE.CylinderGeometry(w.radius * 0.55, w.radius * 0.55, w.width * 0.6, isSTI ? 10 : 8)
      rimGeo.rotateZ(Math.PI / 2)
      const rim = new THREE.Mesh(rimGeo, rimMat)
      wheelGroup.add(rim)

      // Spoke detail for STI
      if (isSTI) {
        for (let s = 0; s < 5; s++) {
          const spokeGeo = new THREE.BoxGeometry(w.width * 0.4, 0.02, w.radius * 0.4)
          const spoke = new THREE.Mesh(spokeGeo, rimMat)
          spoke.rotation.x = (s / 5) * Math.PI
          wheelGroup.add(spoke)
        }
      }

      this.scene.add(wheelGroup)
      this.wheelMeshes.push(wheelGroup)
    }
  }

  applyControls(controls, delta) {
    const def = this.def
    const dt = delta / 1000

    const velocity = this.chassisBody.velocity
    const localVel = new CANNON.Vec3()
    this.chassisBody.vectorToLocalFrame(velocity, localVel)
    this.speed = Math.abs(localVel.z) * 3.6

    // Engine force — 1.5x multiplier for snappier acceleration
    let engineForce = controls.throttle * def.engineForce * 1.5

    // Higher effective top speed — allow 30% over listed max
    const maxSpeed = (def.topSpeedKmh * 1.3) / 3.6
    if (Math.abs(localVel.z) > maxSpeed && controls.throttle > 0) engineForce = 0

    // Boost — infinite, always available (Space bar)
    this.boostActive = controls.boost
    if (this.boostActive) {
      engineForce *= 2.5
    }
    this.boostMeter = 100 // always full

    // AWD for STI, RWD for others
    if (this.def.id === 'wrx_sti') {
      this.vehicle.applyEngineForce(engineForce * 0.4, 0)
      this.vehicle.applyEngineForce(engineForce * 0.4, 1)
      this.vehicle.applyEngineForce(engineForce * 0.6, 2)
      this.vehicle.applyEngineForce(engineForce * 0.6, 3)
    } else {
      this.vehicle.applyEngineForce(engineForce, 2)
      this.vehicle.applyEngineForce(engineForce, 3)
    }

    // Smooth steering — interpolate toward target instead of snapping
    const targetSteer = -controls.steering * def.maxSteer
    if (!this._currentSteer) this._currentSteer = 0
    const steerSpeed = 3.0 // radians per second of steering response
    const steerDiff = targetSteer - this._currentSteer
    this._currentSteer += steerDiff * Math.min(1, steerSpeed * dt * 4)
    this.vehicle.setSteeringValue(this._currentSteer, 0)
    this.vehicle.setSteeringValue(this._currentSteer, 1)

    const brakeForce = controls.brake ? def.brakeForce : 0
    for (let i = 0; i < 4; i++) this.vehicle.setBrake(brakeForce, i)
  }

  update() {
    this.group.position.copy(this.chassisBody.position)
    this.group.quaternion.copy(this.chassisBody.quaternion)

    for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
      this.vehicle.updateWheelTransform(i)
      const t = this.vehicle.wheelInfos[i].worldTransform
      this.wheelMeshes[i].position.copy(t.position)
      this.wheelMeshes[i].quaternion.copy(t.quaternion)
      this.wheelBodies[i].position.copy(t.position)
      this.wheelBodies[i].quaternion.copy(t.quaternion)
    }
  }

  resetPosition(x, y, z) {
    this.chassisBody.position.set(x, y, z)
    this.chassisBody.quaternion.set(0, 0, 0, 1)
    this.chassisBody.velocity.setZero()
    this.chassisBody.angularVelocity.setZero()
    // Also zero out all wheel forces to prevent ghost movement
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(0, i)
      this.vehicle.setBrake(0, i)
      this.vehicle.setSteeringValue(0, i)
    }
  }

  flipUpright() {
    const pos = this.chassisBody.position
    // Place flat on ground at y=2 (above surface so wheels settle naturally)
    this.chassisBody.position.set(pos.x, 2, pos.z)
    this.chassisBody.quaternion.set(0, 0, 0, 1)
    this.chassisBody.velocity.setZero()
    this.chassisBody.angularVelocity.setZero()
    // Tiny downward nudge so suspension engages immediately
    this.chassisBody.velocity.set(0, -0.5, 0)
    for (let i = 0; i < 4; i++) {
      this.vehicle.applyEngineForce(0, i)
      this.vehicle.setBrake(0, i)
      this.vehicle.setSteeringValue(0, i)
    }
    this._currentSteer = 0
  }

  setColor(colorIndex) {
    this.colorIndex = colorIndex
    const color = this.def.colors[colorIndex]
    this.group.traverse(child => {
      if (child.isMesh && child.material.color) {
        if (child.material.emissive && child.material.emissiveIntensity > 0.5) return
        if (child.material.opacity < 1) return
        if (child.material.color.getHex() === 0x111111 || child.material.color.getHex() === 0x050505) return
        if (child.material.color.getHex() === 0x888888 || child.material.color.getHex() === 0x333333) return
        child.material.color.setHex(color)
      }
    })
  }

  dispose() {
    this.scene.remove(this.group)
    for (const wm of this.wheelMeshes) this.scene.remove(wm)
    this.vehicle.removeFromWorld(this.physics.world)
    for (const wb of this.wheelBodies) this.physics.world.removeBody(wb)
  }
}
