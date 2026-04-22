import * as CANNON from 'cannon-es'

/**
 * Physics world wrapper using Cannon-es.
 * Fixed timestep at 60Hz for deterministic simulation.
 */
export class Physics {
  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true

    // Default contact material: moderate friction and no bounce
    this.world.defaultContactMaterial.friction = 0.5
    this.world.defaultContactMaterial.restitution = 0.1

    // Ground material (used for ground planes and terrain)
    this.groundMaterial = new CANNON.Material('ground')
    // Vehicle tire material
    this.tireMaterial = new CANNON.Material('tire')

    // Tire–ground contact: high friction for grip
    this.tireGroundContact = new CANNON.ContactMaterial(
      this.tireMaterial,
      this.groundMaterial,
      { friction: 1.5, restitution: 0.0 }
    )
    this.world.addContactMaterial(this.tireGroundContact)

    // Bodies to sync with Three.js meshes
    this.syncList = [] // { body, mesh }
  }

  /**
   * Add a body and optionally pair it with a Three.js mesh for auto-sync.
   */
  addBody(body, mesh) {
    this.world.addBody(body)
    if (mesh) this.syncList.push({ body, mesh })
  }

  removeBody(body) {
    this.world.removeBody(body)
    this.syncList = this.syncList.filter(s => s.body !== body)
  }

  /**
   * Step the physics world and sync meshes.
   */
  update(delta) {
    const dt = delta / 1000
    this.world.step(1 / 60, dt, 3)

    // Sync Three.js objects to physics bodies
    for (const { body, mesh } of this.syncList) {
      mesh.position.copy(body.position)
      mesh.quaternion.copy(body.quaternion)
    }
  }

  /**
   * Remove all bodies and reset for mode switch.
   */
  clear() {
    // Remove all bodies except the vehicle (handled separately)
    const bodies = [...this.world.bodies]
    for (const body of bodies) {
      this.world.removeBody(body)
    }
    this.syncList = []
  }
}
