import * as THREE from 'three'
import * as CANNON from 'cannon-es'

/**
 * Rock crawl terrain with boulders, checkpoints, and a canyon feel.
 */
export class RockCrawlWorld {
  constructor(experience) {
    this.experience = experience
    this.scene = experience.scene
    this.physics = experience.physics
    this.objects = []

    // Crawl state
    this.checkpoints = []
    this.currentCheckpoint = 0
    this.flipped = false
    this.flipTimer = 0
    this.completed = false

    this._buildTerrain()
    this._buildBoulders()
    this._buildCheckpoints()
    this._buildLights()
  }

  _buildTerrain() {
    // Heightmap-based terrain
    const size = 80
    const segments = 40
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)

    // Generate heightmap
    const verts = geo.attributes.position.array
    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i]
      const z = verts[i + 1] // PlaneGeometry XY, we rotate to XZ
      // Rocky terrain with ridges
      let h = Math.sin(x * 0.15) * 2 + Math.cos(z * 0.12) * 1.5
      h += Math.sin(x * 0.3 + z * 0.2) * 1
      h += Math.random() * 0.5
      h = Math.max(0, h) // no negative heights
      verts[i + 2] = h // Z becomes height after rotation
    }
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      color: 0xb5651d,
      roughness: 0.95,
      flatShading: true,
    })
    const terrain = new THREE.Mesh(geo, mat)
    terrain.rotation.x = -Math.PI / 2
    terrain.receiveShadow = true
    this.scene.add(terrain)
    this.objects.push({ mesh: terrain })

    // Physics heightfield
    // Build a height matrix from the geometry
    const matrix = []
    for (let i = 0; i <= segments; i++) {
      const row = []
      for (let j = 0; j <= segments; j++) {
        const idx = (i * (segments + 1) + j) * 3
        row.push(verts[idx + 2])
      }
      matrix.push(row)
    }

    const hfShape = new CANNON.Heightfield(matrix, {
      elementSize: size / segments,
    })
    const hfBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      material: this.physics.groundMaterial,
    })
    hfBody.addShape(hfShape)
    hfBody.position.set(-size / 2, 0, -size / 2)
    hfBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.physics.world.addBody(hfBody)
    this.objects.push({ body: hfBody })

    // Flat starting area — additional ground plane at the start
    const startGeo = new THREE.PlaneGeometry(10, 10)
    const startMat = new THREE.MeshStandardMaterial({ color: 0x888866, roughness: 0.8 })
    const startMesh = new THREE.Mesh(startGeo, startMat)
    startMesh.rotation.x = -Math.PI / 2
    startMesh.position.set(-30, 0.02, 0)
    startMesh.receiveShadow = true
    this.scene.add(startMesh)
    this.objects.push({ mesh: startMesh })

    // Canyon walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.95, flatShading: true })
    for (const side of [-1, 1]) {
      const wallGeo = new THREE.BoxGeometry(2, 15, 80)
      const wall = new THREE.Mesh(wallGeo, wallMat)
      wall.position.set(side * 42, 5, 0)
      wall.castShadow = true
      this.scene.add(wall)
      this.objects.push({ mesh: wall })

      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(1, 7.5, 40)),
      })
      wallBody.position.set(side * 42, 5, 0)
      this.physics.world.addBody(wallBody)
      this.objects.push({ body: wallBody })
    }

    // Sky — warm canyon colors
    const skyGeo = new THREE.SphereGeometry(300, 16, 8)
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x5588cc) },
        bottomColor: { value: new THREE.Color(0xb5651d) },
      },
      vertexShader: `varying vec3 vWP; void main(){ vWP=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWP; void main(){ float h=normalize(vWP).y; gl_FragColor=vec4(mix(bottomColor,topColor,max(h,0.0)),1.0); }`,
      side: THREE.BackSide,
    })
    const sky = new THREE.Mesh(skyGeo, skyMat)
    this.scene.add(sky)
    this.objects.push({ mesh: sky })
  }

  _buildBoulders() {
    const boulderMat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.9, flatShading: true })

    for (let i = 0; i < 25; i++) {
      const r = 0.8 + Math.random() * 2
      const geo = new THREE.DodecahedronGeometry(r, 1)
      // Randomize vertices for organic look
      const verts = geo.attributes.position.array
      for (let j = 0; j < verts.length; j++) verts[j] += (Math.random() - 0.5) * r * 0.3
      geo.computeVertexNormals()

      const boulder = new THREE.Mesh(geo, boulderMat)
      const x = (Math.random() - 0.5) * 60
      const z = (Math.random() - 0.5) * 60
      boulder.position.set(x, r * 0.3, z)
      boulder.rotation.set(Math.random(), Math.random(), Math.random())
      boulder.castShadow = true
      this.scene.add(boulder)

      const sphereShape = new CANNON.Sphere(r * 0.8)
      const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: sphereShape,
        material: this.physics.groundMaterial,
      })
      body.position.set(x, r * 0.3, z)
      this.physics.world.addBody(body)
      this.objects.push({ mesh: boulder, body })
    }
  }

  _buildCheckpoints() {
    const cpPositions = [
      new THREE.Vector3(-20, 1, 0),
      new THREE.Vector3(-5, 2, 10),
      new THREE.Vector3(10, 3, 5),
      new THREE.Vector3(20, 2, -5),
      new THREE.Vector3(30, 1, 0),
    ]

    const cpMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1, transparent: true, opacity: 0.5 })
    for (const pos of cpPositions) {
      const geo = new THREE.TorusGeometry(2, 0.1, 8, 24)
      const cp = new THREE.Mesh(geo, cpMat.clone())
      cp.position.copy(pos)
      cp.position.y += 2
      cp.rotation.y = Math.PI / 2
      this.scene.add(cp)
      this.checkpoints.push({ mesh: cp, position: pos, reached: false })
      this.objects.push({ mesh: cp })
    }
  }

  _buildLights() {
    this.ambient = new THREE.AmbientLight(0xffeedd, 0.5)
    this.scene.add(this.ambient)
    this.sun = new THREE.DirectionalLight(0xffeedd, 1.0)
    this.sun.position.set(20, 40, 10)
    this.sun.castShadow = true
    this.sun.shadow.camera.left = -50
    this.sun.shadow.camera.right = 50
    this.sun.shadow.camera.top = 50
    this.sun.shadow.camera.bottom = -50
    this.sun.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.sun)
  }

  getStartPosition() {
    return { x: -30, y: 2, z: 0 }
  }

  update(delta, vehiclePos, vehicleUp) {
    if (!vehiclePos) return

    // Check checkpoints
    for (let i = this.currentCheckpoint; i < this.checkpoints.length; i++) {
      const cp = this.checkpoints[i]
      if (!cp.reached && vehiclePos.distanceTo(cp.position) < 5) {
        cp.reached = true
        cp.mesh.material.color.setHex(0xffd700)
        cp.mesh.material.emissive.setHex(0xffd700)
        this.currentCheckpoint = i + 1
        if (this.currentCheckpoint >= this.checkpoints.length) {
          this.completed = true
        }
      }
    }

    // Animate unreached checkpoints
    for (const cp of this.checkpoints) {
      if (!cp.reached) {
        cp.mesh.rotation.x += 0.02
      }
    }

    // Flip detection
    if (vehicleUp && vehicleUp.y < 0.3) {
      this.flipTimer += delta / 1000
      if (this.flipTimer > 3) {
        this.flipped = true
      }
    } else {
      this.flipTimer = 0
      this.flipped = false
    }
  }

  dispose() {
    for (const obj of this.objects) {
      if (obj.mesh) this.scene.remove(obj.mesh)
      if (obj.body) this.physics.world.removeBody(obj.body)
    }
    if (this.ambient) this.scene.remove(this.ambient)
    if (this.sun) this.scene.remove(this.sun)
    this.objects = []
  }
}
