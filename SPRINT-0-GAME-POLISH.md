# Sprint 0: Game Polish & Core Experience (RECOMMENDED)

## Why This Sprint Exists
After auditing the full codebase, these are the highest-impact features missing from the core experience. A game without sound feels dead. A big world without a minimap feels lost. Flat terrain gets boring in 2 minutes. These aren't nice-to-haves — they're the difference between a toy and a game.

## Priority Order Within Sprint

### P0 — Sound Engine (CRITICAL)
The sound toggle exists in the menu but does nothing. Sound is the single biggest immersion gap.

**Engine sound**
- Oscillator-based engine hum (Web Audio API, no files needed)
- Pitch scales with carSpeed (low idle hum → high RPM whine)
- Volume scales with throttle input
- Separate oscillator for boost (higher frequency, distorted)

**Collision SFX**
- Short noise burst on creature hit (use white noise + bandpass filter)
- Metallic clang via oscillator on physics object hits

**Ambient**
- Low background drone for space atmosphere (filtered noise)
- Wind whistle when airborne/gliding (highpass noise, volume = altitude)

**Powerup chimes**
- Short ascending arpeggio on powerup collection (3 oscillator notes)
- Giant mode: deep bass pulse loop while active
- Speed boost: rising whoosh

**Menu sounds**
- Click/select: short high-frequency blip
- Toggle: two-tone blip

**Technical approach**: All procedural via Web Audio API — zero asset files. Create an `AudioEngine` object with methods like `playEngine(speed)`, `playHit()`, `playPowerup(type)`. Mute when `opts.sound === false`.

---

### P1 — Minimap (HIGH)
The map is 400x400 and will grow with Nova Land. Players have zero spatial awareness of creatures, powerups, or boundaries.

**Implementation**
- Small canvas element (150x150px), top-left corner, semi-transparent background
- Render in `updateHUD()` — redraw each frame
- Scale: full 400x400 map → 150px (1 unit ≈ 0.375px)
- Draw:
  - Green square = map boundary
  - White triangle = car (rotated to match carAngle)
  - Red dots = creatures (visible ones only)
  - Colored dots = powerups (uncollected, color matches type)
  - Blue circles = portals
  - Grey dots = trees (static, draw once and cache)
- Car always centered, map scrolls if we go with a "radar" style (better for large maps)
- Fade edges with radial gradient mask

---

### P2 — Terrain Elevation (HIGH)
Flat ground is the #1 reason driving gets repetitive. Even gentle hills transform the experience.

**Implementation**
- Replace flat PlaneGeometry with a subdivided plane (100x100 segments)
- Apply Perlin/simplex noise to vertex Y positions (amplitude: 0-4 units, frequency: low)
- Keep a flat zone around spawn (radius ~30 units) so the car starts on level ground
- Update the CANNON physics ground to match: use a CANNON.Heightfield instead of CANNON.Plane
- Heightfield data = same noise function sampled on a grid
- Car naturally drives over hills thanks to physics
- Adjust camera height calculation to account for terrain elevation under the car

**Constraints**
- Keep amplitude gentle (max 4 units) — the car has no suspension, sharp terrain will cause jitter
- Smooth the noise (low frequency, 2 octaves max)
- Flat zones around portals and spawn point

---

### P3 — Day/Night Cycle (MEDIUM)
Static lighting makes the world feel frozen. A slow day/night cycle adds atmosphere for free.

**Implementation**
- `let timeOfDay = 0` cycling 0→1 over ~120 seconds (2 min full cycle)
- Sunrise (0-0.25): sky orange→blue, sun rises, shadows lengthen
- Day (0.25-0.5): bright, full shadows
- Sunset (0.5-0.75): sky blue→orange→purple
- Night (0.75-1.0): dark sky, stars brighten, headlights glow stronger, creature eyes glow brighter
- Modify: `sun.intensity`, `sun.position.y`, `scene.background`, hemisphere light colors
- Headlights: increase emissiveIntensity at night (already have headlight meshes)
- Stars: increase opacity at night, decrease during day
- Optional: toggle in menu (Auto / Day / Night)

---

### P4 — Tire Tracks (LOW, HIGH VISUAL IMPACT)
Persistent tire marks on the ground when drifting or driving. Cheap visual that makes the world feel lived-in.

**Implementation**
- When drifting or driving: stamp small dark quads on the ground behind each rear wheel
- Use a shared geometry buffer (ring buffer of ~200 track segments)
- Each segment: thin dark rectangle at ground level (y=0.01), oriented along car direction
- Fade opacity over time (newest = dark, oldest = transparent)
- Only create tracks when on ground (not airborne)
- Clear all tracks on reset

---

### P5 — Stunt Score System (MEDIUM)
Reward skillful play. Air time, near misses with creatures, drift duration — all scoreable.

**Implementation**
- Track: `airTime`, `driftTime`, `nearMisses` (creature within 3 units at speed>15 without hit)
- Score popup: "+50 AIR TIME!" floating text that rises and fades
- Combo multiplier: chaining stunts within 3 seconds multiplies points
- Total stunt score in HUD (separate from coins/creatures)
- High score saved to localStorage

---

## What I Explicitly Did NOT Include
- **Multiplayer**: Wrong architecture (single HTML file, no server). Would require a full rewrite.
- **Model loading**: Loading GLB/GLTF models would add complexity and load times. The box-art style is charming and performant.
- **Mobile controls**: Touch controls are a separate UX challenge. Focus on desktop/controller.
- **Save/load game**: The game is a sandbox — there's nothing persistent worth saving beyond high scores.

## Definition of Done
- Engine sound plays and scales with speed (toggle works)
- At least 3 SFX types (hit, powerup, boost)
- Minimap shows car, creatures, powerups, and boundaries
- Terrain has gentle rolling hills (flat near spawn)
- Day/night cycle runs automatically
- No performance regression (target 60fps)
