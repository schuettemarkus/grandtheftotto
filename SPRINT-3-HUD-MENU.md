# Sprint 3: HUD & Menu Overhaul

## Overview
Replace the minimal HUD with a proper heads-up display: center speedometer with auto-shifting gear indicator, bottom-right controls reference, top-right game mode title, and a revamped options menu with all game features.

## Current State
- HUD (lines 37-40): `#hud` div, bottom-left, shows `0 km/h` + static text "WASD / Arrows: Drive  Space: Boost  R: Reset"
- Speed display (line 1239): `Math.floor(Math.abs(carSpeed) * 3.6) + ' km/h'` with GLIDING/DRIFT! suffix
- Coin counter (line 1047): top-left, `Coins: 0`
- Creature score (line 622): top-right, `Creatures: 0` (only shown after first kill)
- Options menu (lines 29-35): centered modal, 4 toggles (creatures, sound, powerups, location), RESUME button
- Menu items (lines 863-877): built dynamically, Xbox D-pad nav + A to toggle

## Tasks

### 1. Center speedometer
- Create a circular speedometer HUD element, centered bottom of screen
- Use a canvas element or SVG for the gauge arc
- Needle/arc fills based on current speed
- Display speed in **MPH** (conversion: `Math.floor(Math.abs(carSpeed) * 2.237)` instead of * 3.6)
- Style: dark semi-transparent background, white/orange needle, tick marks around the arc
- Smooth needle animation (lerp the displayed speed toward actual speed)

### 2. Gear shifter display
- Add a gear indicator next to the speedometer (or integrated into it)
- Auto-shift based on speed thresholds (in MPH):
  - 1st: 0-15 MPH
  - 2nd: 15-30 MPH
  - 3rd: 30-50 MPH
  - 4th: 50-75 MPH
  - 5th: 75-100 MPH
  - 6th: 100+ MPH
- Display current gear prominently: "1" through "6"
- Brief highlight/flash animation on gear change
- R gear when reversing
- N when stationary

### 3. Bottom-right controls reference
- Small, semi-transparent HUD panel in the bottom-right corner
- Show controls for the current input method:
  - **Keyboard**: WASD=Drive, Space=Boost, R=Reset, H=Horn, ESC=Menu
  - **Xbox**: RT/LT=Drive, A=Boost, B=Jump, X=Reset, Y=Fireworks, Start=Menu
- Auto-detect which to show based on last input used (keyboard vs gamepad)
- Compact layout, small font, doesn't obstruct gameplay

### 4. Top-right game info panel
- Show current game mode: "EXPLORE" or "WORM" (ties into Sprint 2)
- Show active powerup name + remaining timer (e.g., "SPEED BOOST 3.2s")
- Show DRIFT! and GLIDING indicators here instead of appended to speed
- Coin count moves here from top-left
- Creature score stays or moves here

### 5. Remove old HUD elements
- Remove the static `#hud` div and its children from HTML
- Remove the old `#spd` speed display
- Move coin counter from top-left to the new top-right panel
- Clean up the old HUD update code in updateCar (line 1239-1242)

### 6. Menu overhaul
- Restructure the options menu to include all game features:
  - **Game Mode**: Explore / Worm (Sprint 2 integration)
  - **Creatures**: ON / OFF
  - **Powerups**: ON / OFF
  - **Sound**: ON / OFF
  - **Location**: Grassland / Desert / Snow / Neon City
  - **Camera**: Normal / Wide / Cinematic
  - **Difficulty**: Easy / Normal / Hard (affects creature speed/aggression)
- Add **START** button — resets the current game mode to initial state
- Add **RESET** button — full game reset (position, score, powerups)
- Style: consistent dark theme, gold accents, larger touch targets
- Each option navigable with Xbox D-pad, A button to select/toggle

### 7. Menu A-button selection fix
- Ensure Xbox A button properly toggles the selected option (currently works but verify)
- Add visual feedback: selected row highlights gold, button press animates
- Add sound effect hook for menu navigation (if sound is ON)

### 8. Responsive layout
- All HUD elements should scale appropriately on different screen sizes
- Use viewport-relative units (vw, vh) or media queries
- Test at common resolutions: 1080p, 1440p, 4K, mobile landscape

## Technical Notes
- Speedometer can be a `<canvas>` element overlaid on the game, or drawn with CSS
- Canvas approach is better for the circular gauge with smooth needle animation
- MPH conversion: `speed_mph = carSpeed * 2.237` (carSpeed is in m/s internally)
- Gear calculation is purely visual — no effect on actual car physics
- The controls reference should detect gamepad connection: `navigator.getGamepads()[0]` truthy = show Xbox layout
- Keep all HUD updates in a single `updateHUD(dt)` function called from the game loop
- Current HUD is DOM-based — continue with DOM for consistency (no need for Three.js HUD)

## Definition of Done
- Circular speedometer centered at bottom with MPH readout
- Gear indicator auto-shifts and displays current gear (1-6, R, N)
- Bottom-right shows correct controls for keyboard or Xbox
- Top-right shows game mode, active powerup timer, coin/creature count
- Menu includes all options listed above with Start and Reset buttons
- All menu items selectable with Xbox A button and D-pad navigation
- Old HUD elements removed, no visual regressions
- Responsive on common screen sizes
