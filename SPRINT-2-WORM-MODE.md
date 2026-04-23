# Sprint 2: Worm Mode

## Overview
Add a second game mode inspired by worm.io — a snake/worm that grows by eating food dots scattered on the map. Accessible via the options menu or by driving through a warphole in the center of the map. The two modes are "Explore" (default driving game) and "Worm."

## Current State
- Single game mode (driving/explore)
- Options menu: toggles for creatures, sound, powerups, location (ESC/Start)
- Portal rings exist at positions [-25,0], [0,-30], [25,0] labeled GARAGE, EXPLORE, RACE — currently decorative only
- Game loop: single `loop()` function calling updateCar, updateCreatures, etc.
- HUD: speed display bottom-left, coins top-left, creature score top-right

## Tasks

### 1. Game mode state machine
- Add `let gameMode = 'explore'` global state
- Create mode transition function: `switchMode(newMode)`
- On switch: clean up current mode's visuals, init new mode's visuals
- Both modes share the same Three.js scene and renderer

### 2. Warphole portals
- Replace the center portal ring (EXPLORE at [0,-30]) with a warphole at map center [0,0]
- Make it a swirling animated torus with particle effects
- Driving into it switches mode: explore -> worm, worm -> explore
- Add a second warphole in the Worm mode arena to return to Explore
- Visual: spinning ring with inner vortex effect (rotating spiral texture on a disc)

### 3. Worm mode — arena setup
- When entering Worm mode: hide the car, creatures, powerups, trees
- Show a top-down or 3/4 camera angle (camera looks straight down or at ~60 degrees)
- Create a flat arena (could reuse the existing ground or create a bordered area)
- Spawn 50-100 food dots (small colored spheres scattered randomly)
- Dark background with neon grid lines on the ground (Tron aesthetic)

### 4. Worm mode — worm mechanics
- Worm = chain of spheres following a head sphere
- Head controlled by WASD/arrows/left stick (direct direction control, not car-style steering)
- Constant forward movement speed (slight acceleration over time)
- Worm starts with 5 segments, grows by 1 segment per food eaten
- Each segment follows the one ahead with a slight delay (store position history)
- Worm body: gradient color (head bright, tail darker) with glow effect

### 5. Worm mode — food & scoring
- Food dots: small glowing spheres with random colors
- When worm head touches food: food disappears, worm grows, score increments
- Eaten food respawns at a random location after 2-3 seconds
- Display score prominently (top center)
- Speed increases slightly as worm gets longer

### 6. Worm mode — collision & game over
- Self-collision: if worm head hits any body segment -> game over
- Wall collision: if worm hits arena boundary -> game over (or wrap around)
- On game over: show score, "Play Again" button, option to return to Explore mode
- Game over screen should be styled consistently with the options menu

### 7. Worm mode — AI worms (stretch goal)
- Add 2-3 AI-controlled worms that roam, eat food, and grow
- Simple AI: move toward nearest food, avoid self-collision
- Player can collide with AI worms (head hits their body = game over, their head hits player body = they die)
- AI worms respawn after death

### 8. Menu integration
- Add "Game Mode" option to the options menu: Explore / Worm
- Selecting it switches mode (same as driving through warphole)
- Add a "Start" button that resets the current mode
- Add a "Reset" button that returns to default state
- Xbox A button should work for all menu selections (already partially works)

### 9. Controls adaptation
- Explore mode: existing car controls (WASD + triggers + boost etc.)
- Worm mode: WASD/arrows = direction, no boost/jump/drift
- Xbox: left stick = direction, no trigger throttle needed
- Update the HUD controls display to match current mode

## Technical Notes
- The worm is purely visual (no Cannon-es physics needed) — just position tracking
- Position history: store last N positions of the head, each segment reads from history[i * spacing]
- Camera for worm mode: fixed height, follows worm head, no orbit controls
- Food collision: simple distance check (same as powerup collection)
- Keep explore mode state intact while in worm mode (just hidden) so switching back is instant

## Definition of Done
- Can switch between Explore and Worm modes via menu and warphole
- Worm mode has working movement, food collection, growth, and scoring
- Self-collision ends the game with a score screen
- Menu shows game mode option
- Controls work with both keyboard and Xbox controller
- Switching back to Explore restores the driving game exactly as it was
