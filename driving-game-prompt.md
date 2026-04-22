# Build a 3D driving exploration game inspired by bruno-simon.com

I want you to build a browser-based 3D driving exploration game in the style of Bruno Simon's portfolio site (bruno-simon.com), but reimagined as a full playground with a vehicle garage, off-road rock crawling, and a racing mode. The hub world is explorable; distinct zones portal into focused game modes.

## Tech stack

- Vite + vanilla JavaScript (or TypeScript if cleaner)
- Three.js for rendering
- Cannon-es (modern fork of Cannon.js) for physics, using RaycastVehicle for wheeled vehicles
- No heavyweight frameworks — keep bundle size reasonable

## Project structure

- `src/Experience/` as the root class that owns the scene, camera, renderer, physics world, and time loop
- Split concerns into `World/`, `Vehicles/`, `Modes/`, `Camera.js`, `Renderer.js`, `Physics.js`, `Controls.js`, `Sizes.js`, `Time.js`, `Resources.js` (asset loader with events)
- A `GameState` module that tracks current mode (Hub / Garage / RockCrawl / Race), selected vehicle, best lap times, and unlocks
- Event-emitter pattern for a central tick/resize loop

## Core driving feel

1. Low-poly vehicles built from a chassis body + 4 wheels via RaycastVehicle
2. WASD / arrow keys for throttle, reverse, steering; Space for handbrake; Shift for boost (limited meter); R to reset/flip; H for horn → fireworks burst; C to cycle camera (chase / hood / cinematic orbit)
3. Mobile touch controls: on-screen joystick + action buttons
4. Per-vehicle tuning: mass, engine force, brake force, steering limit, suspension stiffness/damping/travel, tire friction, wheel radius — so a rock crawler actually crawls and a race car actually rips

## Hub world

- Flat desert-style ground with a soft gradient skybox
- Scatter low-poly physics props (cones, crates, bowling pins, ramps, stacked bricks, giant domino chain) so driving through the hub is fun for its own sake
- Three clearly marked portal zones on the ground (glowing rings + 3D extruded labels): **GARAGE**, **ROCK CRAWL**, **RACE**. Driving into a portal fades the screen and loads that mode

## Garage (mode 1)

- Indoor showroom scene: polished concrete floor, soft area lights, subtle reflections
- Fully stocked lineup of at least 8 vehicles across two classes:
  - Off-road: rock crawler on 40" tires, trophy truck, lifted 4x4, dune buggy, UTV/side-by-side
  - Racing: formula-style open-wheeler, GT coupe, rally car, hypercar
- Turntable display: selected vehicle rotates on a platform; arrow keys / click-drag to cycle; mouse to orbit camera; scroll to zoom
- Info panel per vehicle: name, class, top speed, 0–60, torque, suspension travel, and a short flavor blurb
- Simple paint-swap picker (3–5 colors per vehicle) that persists to localStorage
- "Drive" button spawns the chosen vehicle back in the hub; vehicle choice carries into whichever mode you enter next

## Rock Crawl mode (mode 2)

- Dedicated canyon/boulder terrain built from a heightmap plus hand-placed rock meshes with accurate collision hulls (use `threeToCannon` or trimesh colliders)
- Low-speed, high-torque physics: strong suspension travel, aggressive tire friction, wheel independence matters
- Articulation clearly visible — wheels should droop into gaps and compress over crests
- Scoring by route completion: checkpoints along a marked trail, bonus for clean runs (no flips), penalty/reset if flipped for more than 3 seconds
- Difficulty tiers (Green / Blue / Black) unlocked progressively
- Camera hangs back and tilts with the terrain; optional cockpit view

## Race mode (mode 3)

- Closed-circuit track with banked turns, a long straight, a chicane, and an elevation change; guardrails are physics objects (bumpable but bounded)
- Countdown start (3-2-1-GO), 3-lap default, ghost car of your best lap
- HUD: current lap, lap time, best lap, speedometer, gear indicator, boost meter
- Four AI opponents with waypoint following + rubber-banding so it stays competitive
- Position tracker (1st/2nd/3rd…), finish screen with splits and a "Retry / Back to Hub" prompt
- Only Racing-class vehicles are allowed; attempting to enter with an off-road pick shows a prompt to swap in the garage

## Shared polish

- Soft shadows (PCFSoftShadowMap), bloom for headlights and neon portal rings
- Engine audio whose pitch tracks RPM, tire screech on slip, suspension thuds, wind at high speed
- Loading screen with progress bar tied to Resources.js events
- Fireworks particle burst on horn
- Tire-skid decals that fade over time
- Day/night toggle in the hub (race + crawl have fixed lighting tuned for clarity)

## Deliverables

- A running `npm run dev` experience
- `README.md` with setup, controls, mode overviews, and instructions for adding a new vehicle or track
- Code commented where non-obvious, especially physics tuning constants and the RaycastVehicle setup

## Process

Before coding, propose the folder layout, the vehicle data schema (so all 8+ vehicles share one definition format), and the mode-switching approach (single scene with swapped worlds vs. separate scenes). Ask me any clarifying questions. Then scaffold: cube driving on a plane → RaycastVehicle chassis → hub world → garage → rock crawl → race. Commit after each milestone; don't try to build everything in one shot.
