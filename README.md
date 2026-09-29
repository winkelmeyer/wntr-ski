# WNTR ↗

A little alpine world. No finish line, no wrong turns.

Snowboard in any direction through an endless snowy landscape. Discover a cozy basecamp, a jump park, a frozen lake, and an overlook. Push snowballs, follow the roaming snowcat, take the chairlift, or chase a circuit record. The playful miniature setting is inspired by Bruno Simon’s explorable portfolio; the models and game code are original procedural geometry.

## Play

Open [wntr.ski](https://wntr.ski). The open-world redesign is on `fix/astra-gameplay` until merged and deployed.

Press **W, A, S, or D** to start immediately, or use the start button.

- **Explore:** find four destinations and sixteen golden snowflakes. Discoveries and score save in this browser.
- **Chairlift:** find the boarding ring northwest of basecamp and press E to ride to the overlook. Jump off whenever you like.
- **Snowflake circuit:** find the start at Powder Playground and press E. Pass the eight orange gates in order. Repeat to beat your best time.
- **Fun park:** six kickers, a curved halfpipe, and two grind rails. Approach rails aligned to grind, then press Space to pop off. Two starter ramps sit near base camp.
- **Snowmobile:** find the orange machine beside camp, press E to hop on, then drive with the same controls. E parks it; the map tracks where you left it.
- **Destructibles:** smash twelve crates, snowmen, and barriers at speed for points and flying debris. Push snowballs into each other. Buildings and trees have solid collisions.
- **Sound:** enable SOUND for mountain wind, carving, boost, jumps, powder landings, collisions, smash effects, grinding, collectible chimes, snowmobile engine, and the chairlift motor.

| Input | Action |
|---|---|
| W / up arrow | Push forward, including uphill |
| S / down arrow | Reverse |
| A / D or left / right arrows | Turn in either direction |
| Shift | Boost |
| B | Brake |
| Space | Jump / jump off the chairlift |
| Hold X while airborne | Spin |
| E / Enter | Nearby activity |
| M | Map and destination compass |
| R | Return to basecamp without losing discoveries |
| Escape | Close map / pause / resume |
| Drag the world | Orbit camera |
| Scroll | Zoom |

On touch devices, drag the joystick to move and turn; use the boost, jump, spin, and brake buttons simultaneously. Nearby activities have a tappable button. Drag the world to orbit the camera; pinch with two fingers to zoom. Portrait and landscape are supported. Switching away pauses the game and clears held inputs.

## Develop

Requires Node.js 22.12+.

```sh
npm ci
npm run dev -- --port 4317
```

Visit http://localhost:4317.

```sh
npm test
npm run build
npx playwright install chromium
npx playwright test
```

The browser tests exercise desktop controls, real multitouch input, sound/mute, both phone orientations, WASD startup, snowmobile driving and destructibles, saved progress, and a complete lift-and-circuit route using player controls. The route test takes a few minutes. Set `TEST_URL` to test another deployment.

## Architecture

Vanilla JavaScript, Vite, Three.js, Web Audio. No backend, accounts, external model assets, or API keys.

- `terrain.js`: shared height field, destinations, deterministic trees, solid objects.
- `physics.js`, `vehicle.js`, `park-physics.js`, `destruction.js`: substepped movement, collisions, vehicles, grinds, breakable props, snowballs, jumps, and scoring.
- `activities.js`: chairlift travel and repeatable checkpoint circuit.
- `world.js`, `scenery.js`, `playground.js`, `park.js`, `ramps.js`, `rider.js`, `snowmobile.js`, `destructible-world.js`: recycled terrain chunks, instanced forest, procedural models, debris, animation, and camera.
- `main.js`, `input.js`, `map.js`: lifecycle, keyboard/multitouch controls, navigation.
- `progression.js`: validated local saves, using a separate key from the previous downhill game.
- `audio.js`: generated effects and responsive ambience; one audio context and a master mute.

WebGL and hardware acceleration are required. Fonts use Google Fonts with local fallbacks. Progress belongs to this browser; there is no multiplayer or global leaderboard.

## Hosting

Deploy with the Vite preset, `npm run build`, and output directory `dist`. No environment variables are required.

## License

MIT — see [LICENSE](LICENSE).
