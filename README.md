# Grand Theft Otto

A browser-based 3D driving exploration game built with Three.js and Cannon-es, inspired by [bruno-simon.com](https://bruno-simon.com).

## Setup

```bash
npm install
npm run dev     # starts Vite dev server at http://localhost:5173
npm run build   # production build to dist/
npm run preview # preview the production build
```

## Controls

| Key              | Action                        |
|------------------|-------------------------------|
| W / Arrow Up     | Throttle                      |
| S / Arrow Down   | Reverse                       |
| A / Arrow Left   | Steer left                    |
| D / Arrow Right  | Steer right                   |
| Space            | Brake                         |
| Shift            | Boost (limited meter)         |
| R                | Reset / flip upright          |
| H                | Horn (honk)                   |
| C                | Cycle camera (chase/hood/orbit) |
| G                | Open/close Garage             |
| Enter            | Enter portal zone             |
| Escape           | Return to Hub                 |

## Game Modes

### Hub World
Open desert playground with ramps, cones, crates, and bowling pins. Drive into glowing portal rings to enter other modes.

### Garage
Choose from 8 vehicles across two classes:
- **Off-road**: Rock Crawler, Trophy Truck, Lifted 4×4, Dune Buggy
- **Racing**: Formula Racer, GT Coupe, Rally Car, Hypercar

Each vehicle has unique physics tuning (mass, engine force, suspension, tire friction). Pick a paint color — your choice persists in localStorage.

### Rock Crawl
Canyon terrain with boulders and checkpoints. Off-road vehicles only. Drive through green checkpoint rings to complete the trail. If you flip for more than 3 seconds, you're auto-righted.

### Race
Oval circuit with banked turns, a chicane, and elevation changes. Racing vehicles only. 3 laps against 4 AI opponents. Lap times tracked with best-lap persistence.

## Project Structure

```
src/
  main.js                         Entry point
  Experience/
    Experience.js                 Root class — scene, loop, mode switching
    Camera.js                     Chase/hood/orbit camera
    Renderer.js                   WebGLRenderer setup
    Physics.js                    Cannon-es world wrapper
    Controls.js                   Keyboard input
    GameState.js                  Mode, vehicle selection, persistence
    Audio.js                      WebAudio engine/boost/screech
    Utils/
      EventEmitter.js             Event bus
      Sizes.js                    Viewport tracking
      Time.js                     RAF loop with delta
    Vehicles/
      VehicleData.js              Vehicle definitions (shared schema)
      Vehicle.js                  RaycastVehicle builder + visuals
    World/
      HubWorld.js                 Hub: ground, sky, portals, props
      RaceWorld.js                Race track, AI, HUD
      RockCrawlWorld.js           Canyon terrain, boulders, checkpoints
    Modes/
      GarageUI.js                 DOM-based garage overlay
```

## Adding a New Vehicle

Add an entry to `src/Experience/Vehicles/VehicleData.js` following the schema:

```js
{
  id: 'my_car',
  name: 'My Car',
  class: 'racing', // or 'offroad'
  blurb: 'A short description.',
  colors: [0xff0000, 0x0000ff],
  mass: 800,
  chassisSize: { x: 0.9, y: 0.4, z: 2.0 },
  engineForce: 750,
  brakeForce: 45,
  maxSteer: 0.38,
  topSpeedKmh: 280,
  zeroToSixty: 3.0,
  torque: '400 lb-ft',
  wheels: {
    radius: 0.34,
    width: 0.3,
    front: { x: 0.8, y: -0.15, z: -1.2 },
    rear:  { x: 0.82, y: -0.15, z: 1.1 },
    suspension: { stiffness: 50, damping: 7, travel: 0.2, restLength: 0.25 },
    frictionSlip: 3.5,
  },
}
```

Key tuning parameters:
- `mass` — heavier = more momentum, slower accel
- `engineForce` — raw power applied to rear wheels
- `suspension.stiffness` — higher = stiffer ride (race cars ~50+, crawlers ~20-30)
- `suspension.travel` — max suspension extension in meters
- `frictionSlip` — tire grip; higher = more traction

## Tech Stack

- [Three.js](https://threejs.org) — 3D rendering
- [Cannon-es](https://pmndrs.github.io/cannon-es/) — rigid body physics with RaycastVehicle
- [Vite](https://vitejs.dev) — dev server and bundler
