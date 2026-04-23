# Sprint 1: Nova Land

## Overview
Extend the map on the non-beach edge with a mirrored/duplicate world that transforms when the car crosses the boundary. Crossing the line should feel like a day/night shift — ground, car, sky, and title all change.

## Current State
- Map: 400x400 green ground centered at origin (PlaneGeometry, -200 to +200)
- Ground physics: single infinite CANNON.Plane at y=0
- Car: rally blue WRX STI (carGroup with body, cabin, wheels, wing, etc.)
- Sky: space background (stars, planets, meteors, nebulae, aurora)
- Title: "GRAND THEFT OTTO" canvas billboard at (0, 12, -25)
- Bounds check: respawns car if |x|>195 or |z|>195

## Tasks

### 1. Extend the ground plane
- Add a second 400x400 floor mesh at z=-400 (north edge, flush with existing map at z=-200)
- Use white/baby blue hex grid texture (same pattern, different colors)
- Add a second physics ground body or extend the existing infinite plane (already covers it)
- Add a visible boundary line/glow strip at z=-200 to mark the crossing point

### 2. Nova Land sky dome
- Create a blue gradient sky hemisphere (SphereGeometry, inside-facing) that is hidden by default
- When in Nova Land zone: hide space elements (stars, planets, meteors, nebulae, aurora), show blue sky + sun
- Add fluffy white cloud meshes floating in the Nova Land sky
- Crossfade scene.background from space dark (0x020010) to sky blue (0x87CEEB)
- Transition should be smooth over ~1 second as car crosses z=-200

### 3. Car transformation — Pink Barbie Dune Buggy
- When crossing into Nova Land: swap car materials to pink/hot pink color scheme
- Change body color from rally blue (0x003399) to hot pink (0xFF69B4)
- Change cabin/wing to lighter pink
- Gold wheels stay (princess gold aesthetic works)
- Swap Subaru badge for a sparkle/star icon
- When crossing back: restore original WRX materials
- Consider adding a brief sparkle particle burst during transformation

### 4. Title update
- Create a second title canvas texture: "NOVA LAND" in pink/white with sparkle effects
- Swap the title billboard texture when in Nova Land zone (if title is still visible)
- Or add a floating "NOVA LAND" title above the Nova Land zone

### 5. Boundary detection & state management
- Track `inNovaLand` boolean based on car z-position (z < -200)
- Each frame in updateCar or game loop: check if zone changed
- On zone change, trigger all visual transitions (sky, car, title, ground tint)
- Update bounds check: allow z from -395 to +195 (or whatever the new limits are)

### 6. Creatures & powerups in Nova Land
- Spawn a second set of creatures in the Nova Land zone (z: -200 to -400)
- Could use different creature types or same ones with different colors
- Scatter powerups in Nova Land zone too
- Creatures should respect the new map bounds

### 7. Trees & props in Nova Land
- Spawn trees in the Nova Land zone with different foliage colors (white/pink cherry blossoms?)
- Keep the same tree structure, just different material colors

## Technical Notes
- The physics ground is an infinite CANNON.Plane — it already extends infinitely, so no physics changes needed for the ground surface
- Only the visual floor mesh needs to be added
- Space elements (stars, planets etc.) are scene children — toggle visibility, don't destroy/recreate
- Car materials are references stored on carGroup children — can swap `.material.color` directly
- The `checkBounds()` function at line 1437 needs updated limits

## Definition of Done
- Driving north past z=-200 triggers smooth visual transition
- Ground changes to white/baby blue
- Car transforms to pink dune buggy
- Sky changes from space to blue/sunny
- Driving back south restores everything
- No performance regression
- Works with both keyboard and Xbox controller
