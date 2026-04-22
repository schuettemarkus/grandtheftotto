import * as THREE from 'three'

export class Renderer {
  constructor(experience) {
    this.experience = experience
    this.canvas = experience.canvas
    this.sizes = experience.sizes
    this.scene = experience.scene
    this.camera = experience.camera

    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(this.sizes.pixelRatio)

    // Realistic rendering
    this.instance.shadowMap.enabled = true
    this.instance.shadowMap.type = THREE.PCFSoftShadowMap
    this.instance.toneMapping = THREE.ACESFilmicToneMapping
    this.instance.toneMappingExposure = 1.1
    this.instance.outputColorSpace = THREE.SRGBColorSpace

    // Physically correct lighting for realistic materials
    this.instance.useLegacyLights = false
  }

  resize() {
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }

  update() {
    this.instance.render(this.scene, this.camera.instance)
  }
}
