# 🎮 Party Arcade

Three party games in one mobile-first web app. No installs, no accounts, no game server —
open a link, share a 4-letter room code, play.

| | Game | Players | Length | How it works |
|---|---|---|---|---|
| 🕵️ | **Imposter** | 3–20 | 5–10 min | Pass one phone around |
| 🃏 | **UNO** | 2–10 | 5–15 min | Solo vs AI, or online with friends |
| 🚜 | **Tank Arena** | 2 or 4 | 3–8 min | Real-time 1v1 duel or 2v2 squad battle online |

---

## 🚀 Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

**To play with friends on your phones**, the dev server already listens on every local
interface. Find your machine's LAN IP and open it on any device on the same Wi-Fi:

```
http://192.168.1.42:5173
```

For the two online games one device **hosts** the room and stays on the battle/table
screen — if the host closes the tab or their phone sleeps, the room goes with it.

---

## 🎮 The games

### 🕵️ Imposter — pass & play

One phone, one secret word, one or more liars.

- **Setup:** 3–20 players, 1 or 2 imposters, a category (Food, Places, Animals, Objects,
  Movies, Sports, Jobs) or your own custom word and hint, and an optional round timer.
- **Secret cards:** each player gets a uniquely coloured card. Hold to peek — let go and
  it hides instantly — or tap to reveal and lock. Citizens see the word; the imposter
  sees only the category and a one-word hint to bluff with. The imposter's card is drawn
  from the same colour pool, so nobody can spot them from across the room.
- **Discussion:** a random first speaker, a live countdown with pause and +30s, then a
  group vote.
- **Reveal:** confetti, sound, and an instant rematch with the same group.

### 🃏 UNO

Full 108-card deck — skips, reverses, +2s, wilds and wild +4s.

- **Solo vs AI** — 1–3 bots that hold back their wilds, target whoever is closest to
  winning, and sometimes forget to call UNO (so you can catch them).
- **Online** — 2 to 10 players over a room code. 6+ players automatically switches to a
  double deck.
- **Stacking** (optional, on by default) — answer a +2 with a +2 and pass the growing
  pile along. +2s and +4s don't cross-stack.
- **Catch a missed UNO** — call out a player sitting on one card who forgot to shout.
  They collect one card from *every* other player still in the round, and each giver
  chooses which card to hand over.
- **Not sudden death** — the round keeps going after the first player goes out.
  Everyone gets a placement; finishers watch the rest fight for 2nd.
- Reconnect support: refresh or drop off Wi-Fi mid-game and you get your seat and your
  hand back.

### 🚜 Tank Arena

Top-down real-time tank combat across devices. First team to 3 rounds.

- **Modes:** 1v1 duel or 2v2 squad.
- **Four tank classes:** Striker (balanced), Titan (4 HP bruiser), Specter (fast,
  fragile, rapid-fire), Ballista (slow sniper).
- **Battlefield:** steel bunkers that stop shells, destructible brick, water you can
  shoot over but not drive through, mud that slows you, bushes you can hide in — until
  you fire — and explosive barrels that hurt everyone nearby, teammates included.
- **Air-dropped crates** every 22 seconds: laser railgun, heavy rocket, triple-spread
  shotgun, or a shield that absorbs one hit.
- **Controls:** on a phone, drag anywhere on the top half to drive and anywhere on the
  bottom half to aim and fire. On desktop, WASD to drive, mouse to aim, click or space
  to fire, `E` for a team radar ping in 2v2.
- Rotate to landscape, or tap the orientation button to play in portrait.

---

## ⚙️ Configuration

Everything works out of the box on a normal home network. Copy the example file only if
you need the extras:

```bash
cp .env.example .env
```

Peer-to-peer connections use public STUN servers by default, which is enough for most
Wi-Fi. On strict corporate NAT or mobile data you also need a **TURN relay**. This
project is set up for [Metered](https://dashboard.metered.ca):

```ini
METERED_USERNAME=...
METERED_CREDENTIAL=...
```

Use the **non-`VITE_` names**. Those stay on the server and are only read by
`api/turn.js`; anything prefixed `VITE_` is compiled into the JavaScript bundle and
visible to anyone who opens devtools. The `VITE_`-prefixed equivalents exist purely as a
local-testing fallback.

---

## ☁️ Deployment

Deploys to Vercel with no configuration — `api/turn.js` is picked up as a serverless
function automatically.

1. Import the repo on Vercel.
2. Add `METERED_USERNAME` and `METERED_CREDENTIAL` as environment variables (optional;
   skip for STUN-only).
3. Deploy.

Any static host works too, but without `/api/turn` the app falls back to public STUN and
some players behind strict NAT won't be able to connect.

---

## 🛠️ Development

```bash
npm run dev          # dev server (also reachable from your LAN)
npm run build        # production build
npm run lint         # oxlint
npm test             # vitest
npm run test:watch   # vitest in watch mode
```

**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · PeerJS (WebRTC) · oxlint · Vitest.
Sound is a hand-written Web Audio synthesiser — no audio files, no loading delay, works
offline.

**Architecture in one line:** both online games are *host-authoritative* — the host owns
the real game state, everyone else sends intent and renders what the host broadcasts.

See [`CLAUDE.md`](./CLAUDE.md) for project conventions and layout.
