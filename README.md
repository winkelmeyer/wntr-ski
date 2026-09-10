# WNTR ↗

An atmospheric Three.js snowboarding game. Carve through snow-covered forests, launch off natural kickers, link spins, and leave everything below.

## Play

- **North Face** — 2.4 km, rolling terrain, approachable jumps.
- **Razor Ridge** — 3.2 km, narrower lines and sharper terrain.
- **Blue Glacier** — 4.2 km, bigger kickers and longer airtime.
- **Freeride** — build your score and chase medals.
- **Time Attack** — finish before the clock expires.
- Earn medals to unlock Ice and Midnight boards. Records and equipment persist locally in your browser.

| Input | Action |
|---|---|
| Left/right arrows or A/D | Carve |
| Up arrow or W | Tuck for speed |
| Down arrow or S | Brake |
| Space | Jump |
| Hold X in the air | Spin |
| Escape | Pause/resume |

Touch devices have on-screen carve, brake, jump, and spin buttons. Audio is optional and generated with Web Audio; no sound downloads are required. Backgrounding the game pauses your run.

## Develop

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium
npm run dev -- --port 4317
npx playwright test
```

The full-run browser test plays an entire course using real controls; allow several minutes. To exercise a deployment, set `TEST_URL=https://your-deployment.vercel.app` before running Playwright.

## Architecture

Vanilla JavaScript, Vite, Three.js, Web Audio. No backend, accounts, keys, or paid APIs. Geometry, snow, trees, mountains, rider, and boards are generated in code. Forests use instanced meshes. Physics substeps keep movement consistent across frame rates.

- `src/world.js`: 3D scene, lighting, instanced forest, rider, powder, camera.
- `src/physics.js`: deterministic course simulation, ramps, jumps, collisions, scoring.
- `src/progression.js`: records, medals, equipment unlocks, storage validation.
- `src/main.js`: input, menus, timer, game lifecycle.
- `src/audio.js`: procedural mountain wind.

## Hosting

Deploy with Vercel using the Vite preset, `npm run build`, and output directory `dist`. The site is static and needs no environment variables. Add `wntr.ski` in the project's domain settings and use the DNS record Vercel requests at the domain registrar.

Fonts are served by Google Fonts with local fallbacks. WebGL and hardware acceleration are required. Progress belongs to this browser and can be cleared with browser storage; there is no global leaderboard or multiplayer.
