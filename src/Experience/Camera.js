import * as THREE from 'three'

/**
 * Chase camera with multiple modes:
 *   0 = chase (default), 1 = hood, 2 = cinematic orbit
 */
export class Camera {
  constructor(experience) {
    this.experience = experience
    this.sizes = experience.sizes
    this.scene = experience.scene

    this.mode = 0 // 0=chase, 1=hood, 2=orbit
    this.instance = new THREE.PerspectiveCamera(60, this.sizes.width / this.sizes.height, 0.1, 1000)
    this.instance.position.set(0, 8, 12)
    this.scene.add(this.instance)

    // Chase camera state
    this._offset = new THREE.Vector3(0, 6, 10)
    this._lookTarget = new THREE.Vector3()
    this._currentPos = new THREE.Vector3(0, 8, 12)
    this._orbitAngle = 0
  }

  cycleMode() {
    this.mode = (this.mode + 1) % 3
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
  }

  /**
   * Called each frame with the vehicle's chassis body position and quaternion.
   */
  update(targetPos, targetQuat, speed, delta) {
    if (!targetPos) return
    const dt = delta / 1000

    if (this.mode === 0) {
      // Chase cam: behind and above the vehicle
      const back = new THREE.Vector3(0, 0, 1).applyQuaternion(targetQuat)
      const up = new THREE.Vector3(0, 1, 0)
      const distance = 10 + Math.abs(speed) * 0.3
      const height = 5 + Math.abs(speed) * 0.15

      const idealPos = new THREE.Vector3()
        .copy(targetPos)
        .add(back.multiplyScalar(distance))
        .add(up.multiplyScalar(height))

      this._currentPos.lerp(idealPos, 1 - Math.pow(0.01, dt))
      this.instance.position.copy(this._currentPos)

      this._lookTarget.lerp(targetPos, 1 - Math.pow(0.005, dt))
      this._lookTarget.y = targetPos.y + 1
      this.instance.lookAt(this._lookTarget)
    }
    else if (this.mode === 1) {
      // Hood cam: just above and in front
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuat)
      const pos = new THREE.Vector3().copy(targetPos).add(forward.multiplyScalar(1.5))
      pos.y += 1.5
      this.instance.position.copy(pos)
      const look = new THREE.Vector3().copy(targetPos).add(
        new THREE.Vector3(0, 0, -1).applyQuaternion(targetQuat).multiplyScalar(20)
      )
      look.y = targetPos.y + 0.5
      this.instance.lookAt(look)
    }
    else if (this.mode === 2) {
      // Cinematic orbit
      this._orbitAngle += dt * 0.3
      const radius = 15
      const pos = new THREE.Vector3(
        targetPos.x + Math.cos(this._orbitAngle) * radius,
        targetPos.y + 6,
        targetPos.z + Math.sin(this._orbitAngle) * radius
      )
      this.instance.position.lerp(pos, 1 - Math.pow(0.01, dt))
      this.instance.lookAt(targetPos)
    }
  }

  /** For garage turntable: orbit around origin */
  updateGarage(angle) {
    const radius = 8
    this.instance.position.set(
      Math.cos(angle) * radius,
      3,
      Math.sin(angle) * radius
    )
    this.instance.lookAt(0, 0.5, 0)
  }
}
