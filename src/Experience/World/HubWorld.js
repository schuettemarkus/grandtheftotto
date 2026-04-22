import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Creatures } from './Creatures.js'

/**
 * Geography presets — each defines ground color, sky colors, fog, and prop palette.
 */
const GEO_PRESETS = {
  desert: {
    ground: 0xd2b48c, sky: [0x88bbee, 0xd2b48c], fog: null,
    treeColor: 0x6b8e23, treeTrunk: 0x8b6914, propTint: 0xdaa520,
    ambientIntensity: 0.5, sunIntensity: 1.2, sunPos: [30, 50, 20],
  },
  beach: {
    ground: 0xf5deb3, sky: [0x66ccff, 0xf5deb3], fog: [0xaaddff, 120, 300],
    treeColor: 0x228b22, treeTrunk: 0x8b4513, propTint: 0xee9944,
    ambientIntensity: 0.65, sunIntensity: 1.4, sunPos: [40, 55, 10],
  },
  city: {
    ground: 0x666666, sky: [0x8899aa, 0x555555], fog: [0x888888, 80, 250],
    treeColor: 0x3a6b3a, treeTrunk: 0x5a3a1a, propTint: 0xaaaaaa,
    ambientIntensity: 0.6, sunIntensity: 0.9, sunPos: [20, 40, 30],
  },
  country: {
    ground: 0x4a8c3f, sky: [0x77bbee, 0x88cc66], fog: null,
    treeColor: 0x2d5a1e, treeTrunk: 0x6b3a1a, propTint: 0x8b6914,
    ambientIntensity: 0.55, sunIntensity: 1.1, sunPos: [25, 45, 25],
  },
  forest: {
    ground: 0x2e5a1e, sky: [0x556b2f, 0x1a3a0e], fog: [0x334422, 50, 200],
    treeColor: 0x1a4a0e, treeTrunk: 0x4a2a0a, propTint: 0x6b4914,
    ambientIntensity: 0.35, sunIntensity: 0.7, sunPos: [15, 35, 15],
  },
}

export class HubWorld {
  constructor(experience, geography = 'desert') {
    this.experience = experience
    this.scene = experience.scene
    this.physics = experience.physics
    this.objects = []
    this.geography = geography
    this.geo = GEO_PRESETS[geography] || GEO_PRESETS.desert

    this._buildGround()
    this._buildSkybox()
    this._buildLights()
    this._buildTitle()
    this._buildPortals()
    this._buildProps()
    this._buildTrees()
    this.creatures = new Creatures(this.scene)
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(200, 200, 50, 50)
    const mat = new THREE.MeshStandardMaterial({
      color: this.geo.ground, roughness: 0.9, metalness: 0.0,
    })
    this.ground = new THREE.Mesh(geo, mat)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    const grid = new THREE.GridHelper(200, 40, 0xaa997744, 0xaa997722)
    grid.position.y = 0.01
    this.scene.add(grid)
    this.gridHelper = grid

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.physics.groundMaterial,
    })
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physics.world.addBody(groundBody)
    this.groundBody = groundBody
  }

  _buildSkybox() {
    const skyGeo = new THREE.SphereGeometry(400, 32, 16)
    const [top, bottom] = this.geo.sky
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(top) },
        bottomColor: { value: new THREE.Color(bottom) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    })
    this.sky = new THREE.Mesh(skyGeo, skyMat)
    this.scene.add(this.sky)

    if (this.geo.fog) {
      this.scene.fog = new THREE.Fog(this.geo.fog[0], this.geo.fog[1], this.geo.fog[2])
    }
  }

  _buildLights() {
    this.ambient = new THREE.AmbientLight(0xffffff, this.geo.ambientIntensity)
    this.scene.add(this.ambient)

    this.sun = new THREE.DirectionalLight(0xffffff, this.geo.sunIntensity)
    this.sun.position.set(...this.geo.sunPos)
    this.sun.castShadow = true
    this.sun.shadow.camera.left = -40
    this.sun.shadow.camera.right = 40
    this.sun.shadow.camera.top = 40
    this.sun.shadow.camera.bottom = -40
    this.sun.shadow.camera.far = 120
    this.sun.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sun)
  }

  /**
   * Big floating 3D "GRAND THEFT OTTO" title visible on game load.
   */
  _buildTitle() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')

    // Background glow
    ctx.fillStyle = 'rgba(0,0,0,0)'
    ctx.clearRect(0, 0, 1024, 256)

    // Title text
    ctx.fillStyle = '#ffd700'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 4
    ctx.font = 'bold 100px "Segoe UI", Impact, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText('GRAND THEFT OTTO', 512, 128)
    ctx.fillText('GRAND THEFT OTTO', 512, 128)

    // Subtitle
    ctx.fillStyle = '#ffffff'
    ctx.font = '30px "Segoe UI", sans-serif'
    ctx.fillText('PRESS  W  TO  DRIVE', 512, 210)

    const texture = new THREE.CanvasTexture(canvas)
    texture.minFilter = THREE.LinearFilter
    const geo = new THREE.PlaneGeometry(24, 6)
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
    this.titleMesh = new THREE.Mesh(geo, mat)
    this.titleMesh.position.set(0, 8, -15)
    this.scene.add(this.titleMesh)
  }

  _buildPortals() {
    this.portals = []
    const portalDefs = [
      { name: 'GARAGE',     color: 0x2196f3, position: new THREE.Vector3(-25, 0, 0),  mode: 'garage' },
      { name: 'ROCK CRAWL', color: 0xff6600, position: new THREE.Vector3(0, 0, -30),  mode: 'rockcrawl' },
      { name: 'RACE',       color: 0xff0044, position: new THREE.Vector3(25, 0, 0),   mode: 'race' },
    ]

    for (const p of portalDefs) {
      const group = new THREE.Group()
      group.position.copy(p.position)

      const ringGeo = new THREE.TorusGeometry(3, 0.15, 12, 48)
      const ringMat = new THREE.MeshStandardMaterial({
        color: p.color, emissive: p.color, emissiveIntensity: 2,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.1
      group.add(ring)

      const discGeo = new THREE.CircleGeometry(3, 32)
      const discMat = new THREE.MeshStandardMaterial({ color: p.color, transparent: true, opacity: 0.15 })
      const disc = new THREE.Mesh(discGeo, discMat)
      disc.rotation.x = -Math.PI / 2
      disc.position.y = 0.02
      group.add(disc)

      const canvas = document.createElement('canvas')
      canvas.width = 256; canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(p.name, 128, 44)
      const texture = new THREE.CanvasTexture(canvas)
      const labelGeo = new THREE.PlaneGeometry(4, 1)
      const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
      const label = new THREE.Mesh(labelGeo, labelMat)
      label.position.y = 3.5
      label.userData.billboard = true
      group.add(label)

      this.scene.add(group)
      this.portals.push({ group, mode: p.mode, position: p.position, ring })
    }
  }

  _buildProps() {
    const propMat = new THREE.MeshStandardMaterial({ roughness: 0.7 })

    // Ramps
    const rampGeo = new THREE.BoxGeometry(3, 0.3, 4)
    const rampPositions = [
      { x: 10, z: 10, ry: 0 }, { x: -15, z: 15, ry: 0.5 },
      { x: 8, z: -15, ry: -0.3 }, { x: -10, z: -10, ry: 1 },
    ]
    for (const rp of rampPositions) {
      const mat = propMat.clone()
      mat.color = new THREE.Color(this.geo.propTint)
      const mesh = new THREE.Mesh(rampGeo, mat)
      mesh.position.set(rp.x, 0.6, rp.z)
      mesh.rotation.set(-0.3, rp.ry, 0)
      mesh.castShadow = true
      this.scene.add(mesh)

      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(1.5, 0.15, 2)),
        material: this.physics.groundMaterial,
      })
      body.position.set(rp.x, 0.6, rp.z)
      body.quaternion.setFromEuler(-0.3, rp.ry, 0)
      this.physics.world.addBody(body)
      this.objects.push({ mesh, body })
    }

    // Cones
    const coneGeo = new THREE.ConeGeometry(0.3, 0.8, 8)
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 })
    for (let i = 0; i < 20; i++) {
      const cone = new THREE.Mesh(coneGeo, coneMat)
      const x = (Math.random() - 0.5) * 60
      const z = (Math.random() - 0.5) * 60
      cone.position.set(x, 0.4, z)
      cone.castShadow = true
      this.scene.add(cone)
      const body = new CANNON.Body({ mass: 2, shape: new CANNON.Cylinder(0.05, 0.3, 0.8, 8), material: this.physics.groundMaterial })
      body.position.set(x, 0.4, z)
      this.physics.addBody(body, cone)
      this.objects.push({ mesh: cone, body })
    }

    // Crates
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    const crateMat = new THREE.MeshStandardMaterial({ color: this.geo.propTint, roughness: 0.8 })
    for (let i = 0; i < 12; i++) {
      const crate = new THREE.Mesh(crateGeo, crateMat)
      const x = (Math.random() - 0.5) * 50
      const z = (Math.random() - 0.5) * 50
      crate.position.set(x, 0.4, z)
      crate.castShadow = true
      this.scene.add(crate)
      const body = new CANNON.Body({ mass: 5, shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.4, 0.4)) })
      body.position.set(x, 0.4, z)
      this.physics.addBody(body, crate)
      this.objects.push({ mesh: crate, body })
    }

    // Bowling pins cluster
    const pinGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.6, 8)
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= row; col++) {
        const pin = new THREE.Mesh(pinGeo, pinMat)
        const x = -30 + col * 0.5 - row * 0.25
        const z = -8 + row * 0.5
        pin.position.set(x, 0.3, z)
        pin.castShadow = true
        this.scene.add(pin)
        const body = new CANNON.Body({ mass: 0.5, shape: new CANNON.Cylinder(0.08, 0.15, 0.6, 8) })
        body.position.set(x, 0.3, z)
        this.physics.addBody(body, pin)
        this.objects.push({ mesh: pin, body })
      }
    }

    // City-specific: add some tall buildings
    if (this.geography === 'city') {
      const buildMat = new THREE.MeshStandardMaterial({ color: 0x555566, roughness: 0.7 })
      for (let i = 0; i < 15; i++) {
        const h = 4 + Math.random() * 12
        const w = 3 + Math.random() * 3
        const d = 3 + Math.random() * 3
        const bGeo = new THREE.BoxGeometry(w, h, d)
        const building = new THREE.Mesh(bGeo, buildMat)
        const x = (Math.random() - 0.5) * 160
        const z = (Math.random() - 0.5) * 160
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue
        building.position.set(x, h / 2, z)
        building.castShadow = true
        this.scene.add(building)
        const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)) })
        body.position.set(x, h / 2, z)
        this.physics.world.addBody(body)
        this.objects.push({ mesh: building, body })
        // Windows
        const winMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.3 })
        for (let wy = 1.5; wy < h - 1; wy += 2) {
          for (const side of [-1, 1]) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), winMat)
            win.position.set(x + side * (w / 2 + 0.01), wy, z)
            win.rotation.y = side > 0 ? 0 : Math.PI
            this.scene.add(win)
            this.objects.push({ mesh: win })
          }
        }
      }
    }
  }

  _buildTrees() {
    const count = this.geography === 'forest' ? 80 : this.geography === 'country' ? 40 : this.geography === 'beach' ? 15 : 10
    const treeColor = this.geo.treeColor
    const trunkColor = this.geo.treeTrunk
    const isPalm = this.geography === 'beach'

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 170
      const z = (Math.random() - 0.5) * 170
      if (Math.abs(x) < 6 && Math.abs(z) < 6) continue

      const group = new THREE.Group()
      group.position.set(x, 0, z)

      // Trunk
      const trunkH = isPalm ? 3 + Math.random() * 2 : 1.5 + Math.random()
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 })
      )
      trunk.position.y = trunkH / 2
      trunk.castShadow = true
      group.add(trunk)

      // Canopy
      if (isPalm) {
        for (let j = 0; j < 5; j++) {
          const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.05, 1.5),
            new THREE.MeshStandardMaterial({ color: treeColor, roughness: 0.8 })
          )
          leaf.position.y = trunkH
          leaf.rotation.y = (j / 5) * Math.PI * 2
          leaf.rotation.z = 0.4
          group.add(leaf)
        }
      } else {
        const canopy = new THREE.Mesh(
          new THREE.SphereGeometry(0.8 + Math.random() * 0.6, 6, 5),
          new THREE.MeshStandardMaterial({ color: treeColor, roughness: 0.8, flatShading: true })
        )
        canopy.position.y = trunkH + 0.4
        canopy.castShadow = true
        group.add(canopy)
      }

      this.scene.add(group)
      this.objects.push({ mesh: group })
    }
  }

  checkPortals(vehiclePos) {
    for (const portal of this.portals) {
      const dist = vehiclePos.distanceTo(portal.position)
      if (dist < 4) return portal.mode
    }
    return null
  }

  update(elapsed, delta, vehiclePos) {
    for (const portal of this.portals) {
      portal.ring.rotation.z = elapsed * 0.001 * 0.5
      const pulse = 1.5 + Math.sin(elapsed * 0.003) * 0.5
      portal.ring.material.emissiveIntensity = pulse
      portal.group.traverse(child => {
        if (child.userData.billboard) {
          child.lookAt(this.experience.camera.instance.position)
        }
      })
    }

    // Title billboard
    if (this.titleMesh) {
      this.titleMesh.lookAt(this.experience.camera.instance.position)
      // Fade out title as player moves away from spawn
      if (vehiclePos) {
        const dist = vehiclePos.length()
        this.titleMesh.material.opacity = Math.max(0, 1 - dist / 30)
        if (this.titleMesh.material.opacity <= 0 && this.titleMesh.parent) {
          this.scene.remove(this.titleMesh)
        }
      }
    }

    this.creatures.update(delta, vehiclePos)
  }

  getCreatureWarning(vehiclePos) {
    return this.creatures.getNearestInfo(vehiclePos)
  }

  dispose() {
    this.scene.remove(this.ground)
    this.scene.remove(this.gridHelper)
    this.scene.remove(this.sky)
    this.scene.remove(this.ambient)
    this.scene.remove(this.sun)
    if (this.titleMesh && this.titleMesh.parent) this.scene.remove(this.titleMesh)
    this.scene.fog = null
    this.physics.world.removeBody(this.groundBody)
    for (const portal of this.portals) this.scene.remove(portal.group)
    for (const obj of this.objects) {
      if (obj.mesh) this.scene.remove(obj.mesh)
      if (obj.body) this.physics.removeBody(obj.body)
    }
    this.creatures.dispose()
    this.objects = []
  }
}
