# CLAUDE.md

Party Arcade — a mobile-first React SPA hosting three party games: **Imposter**
(pass-and-play), **UNO** (solo-vs-AI and P2P multiplayer), and **Tank Arena**
(real-time P2P). Everything runs in the browser; multiplayer is peer-to-peer over
WebRTC with no game server.

## Commands

```bash
npm run dev          # Vite dev server, host: true so phones on the same Wi-Fi can connect
npm run build        # production build
npm run lint         # oxlint  (NOT eslint — see below)
npm test             # vitest, single run
npm run test:watch   # vitest, watch mode
```

To test multiplayer you need two devices: `npm run dev`, then open
`http://<your-lan-ip>:5173` on a phone on the same network.

## Stack

React 19 · Vite 8 · Tailwind CSS v4 · PeerJS · oxlint · Vitest · deployed on Vercel.

Tailwind v4 is configured **CSS-first** in `src/index.css` via `@tailwindcss/vite`.
There is no `tailwind.config.js` — do not create one.

Linting is **oxlint**, not ESLint. `eslint-disable` comments are honoured, but there is
no ESLint config and no `eslint` dependency. Rules live in `.oxlintrc.json`.

## Layout

```
src/
  App.jsx                 state-based router (no react-router); ?game= / ?room= deep links
  components/             HUB-ONLY shared UI (Navbar, GameHub). Nothing game-specific.
  services/               cross-game infrastructure (peerConfig.js: ICE/TURN + room codes)
  utils/sound.js          Web Audio synth shared by all three games
  data/games.js           hub card metadata
  games/<game>/
    <Game>.jsx            composition + screen routing only
    components/           that game's UI
    engine/               PURE game logic, no React, no side effects — this is what tests target
    hooks/                stateful React glue between engine and UI
    services/             that game's networking
    utils/ constants/ data/
api/turn.js               Vercel serverless: hands out TURN credentials
```

Rules of thumb:

- A game's code lives under `src/games/<game>/`. If it is only used by one game, it does
  not belong in `src/components/`, `src/data/` or `src/utils/`.
- `engine/` must stay free of React and of side effects. Sound, broadcasting and
  celebration are injected as an `fx` object so the engine stays unit-testable.
- When a file passes ~400 lines, that is the signal to split it, not a target to beat.

## The rule that matters most: host authority

Both networked games are **host-authoritative**. The host owns the only real game state;
clients send *intent* and render whatever the host broadcasts.

```
Client  --- intent (ACTION_* / FIRE / PLAYER_INPUT) --->  Host
Client  <-- full state snapshot (SYNC_GAME_STATE / WORLD_STATE) --- Host
```

Never let a client mutate game state locally and assume it sticks. Optimistic lobby
updates are fine — the host's next broadcast is the truth. Never trust a value a client
sent as game-affecting input without re-deriving or validating it host-side.

The host is also a player: `playerId` 0 in UNO, slot `p1` (blue) in Tank.

Host state deliberately lives in a `useRef`, not `useState`, so it is immune to stale
closures inside network callbacks and timers. Keep it that way.

## Before claiming a change works

Run `npm test`. The engine tests exist because the UNO rules and the Tank collision
maths are easy to break silently.

For rules changes, the invariant to check by hand is that a UNO deck stays whole:
`sum(all hands) + drawPile + discardPile === 108` (216 with 6+ players, which uses two
decks).

For anything touching networking or controls, test on two real devices. A dev-server
tab talking to another tab on the same machine does not exercise ICE, NAT or touch
input.

## Environment

Copy `.env.example` to `.env`. Multiplayer works on most home Wi-Fi with public STUN
alone; TURN credentials (`METERED_USERNAME` / `METERED_CREDENTIAL`) are only needed for
strict NAT and mobile data. Use the non-`VITE_` names so the values stay server-side —
`VITE_`-prefixed vars are baked into the client bundle.

## Notes

`docs/` holds longer working notes (architecture, per-engine deep dives, the bug ledger,
deferred work). It is **git-ignored** and local to this machine — read it if present,
but do not assume a collaborator has it.
