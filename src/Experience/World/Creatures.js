import * as THREE from 'three'

/**
 * Creatures system — dinosaurs, dragons, and wolves that roam the hub world.
 * When the player gets close, they chase. When the player escapes, they wander off.
 */

const CREATURE_DEFS = [
  // Dinosaurs — large, green, slower but persistent
  { type: 'dinosaur', count: 4, chaseRange: 25, giveUpRange: 45, wanderSpeed: 1.5, chaseSpeed: 5, size: 1.8 },
  // Dragons — red, flying height, medium speed
  { type: 'dragon', count: 3, chaseRange: 30, giveUpRange: 50, wanderSpeed: 2, chaseSpeed: 7, size: 1.5 },
  // Wolves — small, fast, pack hunters
  { type: 'wolf', count: 6, chaseRange: 20, giveUpRange: 35, wanderSpeed: 2.5, chaseSpeed: 8, size: 0.7 },
]

export class Creatures {
  constructor(scene) {
    this.scene = scene
    this.creatures = []
    this.disabled = false
    this._spawn()
  }

  setDisabled(val) {
    this.disabled = val
    for (const c of this.creatures) {
      c.group.visible = !val
      if (val) c.state = 'wander'
    }
  }

  _spawn() {
    for (const def of CREATURE_DEFS) {
      for (let i = 0; i < def.count; i++) {
        const homeX = (Math.random() - 0.5) * 150
        const homeZ = (Math.random() - 0.5) * 150
        // Avoid spawning on portals
        if (Math.abs(homeX) < 8 && Math.abs(homeZ) < 8) continue

        const group = new THREE.Group()
        group.position.set(homeX, 0, homeZ)
        this.scene.add(group)

        this._buildModel(group, def.type, def.size)

        this.creatures.push({
          type: def.type,
          group,
          homeX, homeZ,
          x: homeX, z: homeZ,
          angle: Math.random() * Math.PI * 2,
          state: 'wander', // 'wander' | 'chase'
          wanderTarget: { x: homeX + (Math.random() - 0.5) * 30, z: homeZ + (Math.random() - 0.5) * 30 },
          wanderTimer: 120 + Math.random() * 180,
          animPhase: Math.random() * Math.PI * 2,
          chaseRange: def.chaseRange,
          giveUpRange: def.giveUpRange,
          wanderSpeed: def.wanderSpeed,
          chaseSpeed: def.chaseSpeed,
          size: def.size,
        })
      }
    }
  }

  _buildModel(group, type, size) {
    if (type === 'dinosaur') {
      // T-Rex style — green body, big head, tiny arms, thick tail
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.7, flatShading: true })
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a5a35, roughness: 0.7, flatShading: true })

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.7, size * 0.8, size * 1.4), bodyMat)
      body.position.y = size * 0.9
      body.castShadow = true
      group.add(body)

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, size * 0.5, size * 0.6), bodyMat)
      head.position.set(0, size * 1.4, -size * 0.8)
      head.castShadow = true
      group.add(head)

      // Jaw
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(size * 0.45, size * 0.15, size * 0.5), darkMat)
      jaw.position.set(0, size * 1.1, -size * 0.85)
      group.add(jaw)

      // Eyes
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.5 })
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.08, 6, 6), eyeMat)
        eye.position.set(side * size * 0.22, size * 1.5, -size * 0.95)
        group.add(eye)
      }

      // Legs (thick)
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(size * 0.25, size * 0.7, size * 0.3), darkMat)
        leg.position.set(side * size * 0.3, size * 0.35, size * 0.2)
        leg.castShadow = true
        leg.userData.leg = true
        group.add(leg)
      }

      // Tiny arms
      for (const side of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(size * 0.08, size * 0.25, size * 0.08), bodyMat)
        arm.position.set(side * size * 0.35, size * 1.0, -size * 0.4)
        group.add(arm)
      }

      // Tail
      const tail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.3, size * 0.35, size * 1.2), bodyMat)
      tail.position.set(0, size * 0.8, size * 1.1)
      tail.castShadow = true
      tail.userData.tail = true
      group.add(tail)

      // Spines
      for (let i = 0; i < 6; i++) {
        const spine = new THREE.Mesh(
          new THREE.ConeGeometry(size * 0.06, size * 0.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x3a7a4a, flatShading: true })
        )
        spine.position.set(0, size * 1.35, -size * 0.4 + i * size * 0.35)
        group.add(spine)
      }
    }
    else if (type === 'dragon') {
      // Dragon — red/dark red, wings, horns, fire glow
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.6, flatShading: true })
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xa01020, roughness: 0.7, flatShading: true, side: THREE.DoubleSide })

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.6, size * 0.5, size * 1.3), bodyMat)
      body.position.y = size * 1.2
      body.castShadow = true
      group.add(body)

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(size * 0.4, size * 0.35, size * 0.5), bodyMat)
      head.position.set(0, size * 1.4, -size * 0.7)
      head.castShadow = true
      group.add(head)

      // Horns
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5 })
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(size * 0.04, size * 0.3, 5), hornMat)
        horn.position.set(side * size * 0.15, size * 1.65, -size * 0.6)
        horn.rotation.x = -0.3
        group.add(horn)
      }

      // Eyes — glowing
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 1 })
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.06, 6, 6), eyeMat)
        eye.position.set(side * size * 0.16, size * 1.48, -size * 0.88)
        group.add(eye)
      }

      // Wings — large triangular
      for (const side of [-1, 1]) {
        const wingShape = new THREE.Shape()
        wingShape.moveTo(0, 0)
        wingShape.lineTo(side * size * 1.5, -size * 0.3)
        wingShape.lineTo(side * size * 1.2, size * 0.8)
        wingShape.lineTo(side * size * 0.4, size * 0.5)
        wingShape.lineTo(0, 0)
        const wingGeo = new THREE.ShapeGeometry(wingShape)
        const wing = new THREE.Mesh(wingGeo, wingMat)
        wing.rotation.x = -Math.PI / 2
        wing.position.set(0, size * 1.3, -size * 0.1)
        wing.castShadow = true
        wing.userData.wing = true
        wing.userData.side = side
        group.add(wing)
      }

      // Legs
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(size * 0.15, size * 0.6, size * 0.2), bodyMat)
        leg.position.set(side * size * 0.25, size * 0.6, size * 0.2)
        leg.userData.leg = true
        group.add(leg)
      }

      // Tail
      const tail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.2, size * 0.2, size * 1.0), bodyMat)
      tail.position.set(0, size * 1.1, size * 0.95)
      tail.userData.tail = true
      group.add(tail)

      // Fire glow (visible when chasing)
      const fireGeo = new THREE.SphereGeometry(size * 0.15, 8, 8)
      const fireMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2, transparent: true, opacity: 0 })
      const fire = new THREE.Mesh(fireGeo, fireMat)
      fire.position.set(0, size * 1.35, -size * 1.0)
      fire.userData.fire = true
      group.add(fire)
    }
    else if (type === 'wolf') {
      // Wolf — grey, lean, pointy ears
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.8, flatShading: true })
      const lightMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, flatShading: true })

      // Body
      const body = new THREE.Mesh(new THREE.BoxGeometry(size * 0.5, size * 0.45, size * 1.1), bodyMat)
      body.position.y = size * 0.55
      body.castShadow = true
      group.add(body)

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(size * 0.35, size * 0.3, size * 0.4), lightMat)
      head.position.set(0, size * 0.7, -size * 0.6)
      group.add(head)

      // Snout
      const snout = new THREE.Mesh(new THREE.BoxGeometry(size * 0.2, size * 0.15, size * 0.25), lightMat)
      snout.position.set(0, size * 0.6, -size * 0.82)
      group.add(snout)

      // Nose
      const nose = new THREE.Mesh(new THREE.SphereGeometry(size * 0.04, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x111111 }))
      nose.position.set(0, size * 0.62, -size * 0.95)
      group.add(nose)

      // Ears
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(size * 0.07, size * 0.2, 4), bodyMat)
        ear.position.set(side * size * 0.12, size * 0.9, -size * 0.5)
        group.add(ear)
      }

      // Eyes
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xcccc00, emissive: 0xcccc00, emissiveIntensity: 0.3 })
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.04, 6, 6), eyeMat)
        eye.position.set(side * size * 0.12, size * 0.75, -size * 0.73)
        eye.userData.eye = true
        group.add(eye)
      }

      // Legs
      for (const side of [-1, 1]) {
        for (const fz of [-size * 0.3, size * 0.3]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(size * 0.1, size * 0.45, size * 0.12), bodyMat)
          leg.position.set(side * size * 0.2, size * 0.22, fz)
          leg.userData.leg = true
          group.add(leg)
        }
      }

      // Tail
      const tail = new THREE.Mesh(new THREE.BoxGeometry(size * 0.08, size * 0.1, size * 0.5), bodyMat)
      tail.position.set(0, size * 0.6, size * 0.75)
      tail.rotation.x = 0.3
      tail.userData.tail = true
      group.add(tail)
    }
  }

  /**
   * Update all creatures each frame.
   * @param {number} delta - ms since last frame
   * @param {THREE.Vector3|null} playerPos - vehicle position
   */
  update(delta, playerPos) {
    const dt = delta / 1000

    for (const c of this.creatures) {
      c.animPhase += dt * (c.state === 'chase' ? 8 : 4)
      const legAnim = Math.sin(c.animPhase) * 0.3

      if (!playerPos || this.disabled) {
        this._wander(c, dt)
      } else {
        const dx = playerPos.x - c.x
        const dz = playerPos.z - c.z
        const dist = Math.sqrt(dx * dx + dz * dz)

        // Creatures must NEVER touch the car — keep a hard 8-unit gap
        // If they get within 8, they get forcefully pushed away instantly
        const keepAwayDist = 8
        if (dist < keepAwayDist) {
          // Hard push — instant, not scaled by dt, so they can't creep in
          const pushX = -dx / (dist || 1)
          const pushZ = -dz / (dist || 1)
          const pushStrength = (keepAwayDist - dist) * 2
          c.x += pushX * pushStrength
          c.z += pushZ * pushStrength
          // Scatter away
          c.state = 'wander'
          c.wanderTarget = {
            x: c.x + pushX * 30 + (Math.random() - 0.5) * 10,
            z: c.z + pushZ * 30 + (Math.random() - 0.5) * 10,
          }
          c.wanderTimer = 240
        } else if (c.state === 'wander' && dist < c.chaseRange) {
          c.state = 'chase'
        } else if (c.state === 'chase' && dist > c.giveUpRange) {
          c.state = 'wander'
          c.wanderTarget = {
            x: c.x + (Math.random() - 0.5) * 40,
            z: c.z + (Math.random() - 0.5) * 40,
          }
          c.wanderTimer = 200
        }

        if (c.state === 'chase') {
          // Chase but orbit at keepAwayDist — never close the last gap
          if (dist > keepAwayDist + 2) {
            const targetAngle = Math.atan2(dx, dz)
            let angleDiff = targetAngle - c.angle
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
            c.angle += angleDiff * dt * 5

            c.x += Math.sin(c.angle) * c.chaseSpeed * dt
            c.z += Math.cos(c.angle) * c.chaseSpeed * dt
          } else {
            // Close enough — orbit around the car instead of charging in
            c.angle += dt * 2
            c.x += Math.sin(c.angle) * c.wanderSpeed * dt
            c.z += Math.cos(c.angle) * c.wanderSpeed * dt
          }
        } else {
          this._wander(c, dt)
        }
      }

      // Clamp to world
      c.x = Math.max(-95, Math.min(95, c.x))
      c.z = Math.max(-95, Math.min(95, c.z))

      // Update Three.js group
      c.group.position.set(c.x, 0, c.z)
      c.group.rotation.y = c.angle

      // Animate parts
      c.group.traverse(child => {
        if (child.userData.leg) {
          child.rotation.x = legAnim * (c.state === 'chase' ? 1 : 0.5)
        }
        if (child.userData.tail) {
          child.rotation.y = Math.sin(c.animPhase * 0.7) * 0.4
        }
        if (child.userData.wing) {
          child.rotation.z = Math.sin(c.animPhase * 2) * 0.3 * child.userData.side
        }
        if (child.userData.fire) {
          child.material.opacity = c.state === 'chase' ? 0.6 + Math.sin(c.animPhase * 4) * 0.3 : 0
        }
        if (child.userData.eye && c.type === 'wolf') {
          child.material.emissiveIntensity = c.state === 'chase' ? 1.5 : 0.3
        }
      })
    }
  }

  _wander(c, dt) {
    c.wanderTimer -= dt * 60
    if (c.wanderTimer <= 0) {
      c.wanderTarget = {
        x: c.homeX + (Math.random() - 0.5) * 40,
        z: c.homeZ + (Math.random() - 0.5) * 40,
      }
      c.wanderTimer = 180 + Math.random() * 240
    }

    const dx = c.wanderTarget.x - c.x
    const dz = c.wanderTarget.z - c.z
    const targetAngle = Math.atan2(dx, dz)
    let angleDiff = targetAngle - c.angle
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
    c.angle += angleDiff * dt * 2

    c.x += Math.sin(c.angle) * c.wanderSpeed * dt
    c.z += Math.cos(c.angle) * c.wanderSpeed * dt
  }

  /**
   * Get the nearest creature's state for HUD warning.
   */
  getNearestInfo(playerPos) {
    if (!playerPos) return null
    let nearest = null, nearestDist = Infinity
    for (const c of this.creatures) {
      const d = Math.sqrt((playerPos.x - c.x) ** 2 + (playerPos.z - c.z) ** 2)
      if (d < nearestDist) { nearestDist = d; nearest = c }
    }
    if (!nearest || nearestDist > nearest.giveUpRange * 1.2) return null
    return {
      type: nearest.type,
      chasing: nearest.state === 'chase',
      distance: nearestDist,
    }
  }

  dispose() {
    for (const c of this.creatures) {
      this.scene.remove(c.group)
    }
    this.creatures = []
  }
}
